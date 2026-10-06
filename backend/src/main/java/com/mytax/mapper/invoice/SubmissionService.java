package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.consolidation.ConsolidatedInvoice;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceRepository;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceStatus;
import com.mytax.mapper.consolidation.ConsolidationService;
import com.mytax.mapper.invoice.dto.SubmissionResponse;
import com.mytax.mapper.mapping.InvoiceStatus;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.mapping.MappedInvoiceLineItemRepository;
import com.mytax.mapper.mapping.MappedInvoiceRepository;
import com.mytax.mapper.myinvois.MyInvoisAuthService;
import com.mytax.mapper.myinvois.MyInvoisSubmissionClient;
import com.mytax.mapper.myinvois.dto.DocumentSubmissionItem;
import com.mytax.mapper.myinvois.dto.SubmissionStatusResponse;
import com.mytax.mapper.myinvois.dto.SubmitDocumentsRequest;
import com.mytax.mapper.myinvois.dto.SubmitDocumentsResponse;
import com.mytax.mapper.profile.BusinessProfile;
import com.mytax.mapper.profile.BusinessProfileService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;

@Service
public class SubmissionService {

    private static final Logger log = LoggerFactory.getLogger(SubmissionService.class);

    private final InvoiceReviewService invoiceReviewService;
    private final ConsolidationService consolidationService;
    private final UblDocumentBuilder ublDocumentBuilder;
    private final MyInvoisAuthService myInvoisAuthService;
    private final MyInvoisSubmissionClient myInvoisSubmissionClient;
    private final BusinessProfileService businessProfileService;
    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;
    private final ConsolidatedInvoiceRepository consolidatedInvoiceRepository;
    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public SubmissionService(InvoiceReviewService invoiceReviewService,
                              ConsolidationService consolidationService,
                              UblDocumentBuilder ublDocumentBuilder,
                              MyInvoisAuthService myInvoisAuthService,
                              MyInvoisSubmissionClient myInvoisSubmissionClient,
                              BusinessProfileService businessProfileService,
                              MappedInvoiceRepository mappedInvoiceRepository,
                              MappedInvoiceLineItemRepository lineItemRepository,
                              ConsolidatedInvoiceRepository consolidatedInvoiceRepository,
                              SubmissionRepository submissionRepository,
                              ObjectMapper objectMapper) {
        this.invoiceReviewService = invoiceReviewService;
        this.consolidationService = consolidationService;
        this.ublDocumentBuilder = ublDocumentBuilder;
        this.myInvoisAuthService = myInvoisAuthService;
        this.myInvoisSubmissionClient = myInvoisSubmissionClient;
        this.businessProfileService = businessProfileService;
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.consolidatedInvoiceRepository = consolidatedInvoiceRepository;
        this.submissionRepository = submissionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubmissionResponse submit(Long mappedInvoiceId, Long userId) {
        MappedInvoice invoice = invoiceReviewService.getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw new IllegalStateException("Invoice must be CONFIRMED before submission (current status: " + invoice.getStatus() + ")");
        }
        // Buyer name is mandatory for a standard e-invoice and is required to build the UBL document.
        // Validate here so a missing buyer surfaces as a clear 400 instead of an opaque build failure.
        if (invoice.getBuyerName() == null || invoice.getBuyerName().isBlank()) {
            throw new IllegalArgumentException("Buyer name is required before submission");
        }

        BusinessProfile supplier = businessProfileService.getOwned(userId);
        List<MappedInvoiceLineItem> lineItems = lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId());
        BuiltDocument built = ublDocumentBuilder.build(supplier, invoice, lineItems);
        if (log.isDebugEnabled()) {
            log.debug("Built MyInvois document for mapped invoice {}: {}", invoice.getId(),
                    new String(Base64.getDecoder().decode(built.base64Document()), StandardCharsets.UTF_8));
        }

        SubmitDocumentsResponse response = submitBuiltDocument(userId, built);

        Submission submission = Submission.builder()
                .mappedInvoiceId(invoice.getId())
                .myInvoisSubmissionUid(response.submissionUid())
                .myInvoisDocumentUuid(acceptedDocumentUuid(response))
                .status(SubmissionStatus.PENDING)
                .submittedAt(Instant.now())
                .responsePayload(toJson(response))
                .build();
        submission = submissionRepository.save(submission);

        invoice.setStatus(InvoiceStatus.SUBMITTED);
        mappedInvoiceRepository.save(invoice);

        return toResponse(submission);
    }

    /** Shared with {@code ConsolidatedSubmissionService} — the MyInvois call itself doesn't care
     *  whether the built document represents one invoice or a consolidated aggregate. */
    public SubmitDocumentsResponse submitBuiltDocument(Long userId, BuiltDocument built) {
        String accessToken = myInvoisAuthService.getAccessToken(userId);
        SubmitDocumentsRequest request = new SubmitDocumentsRequest(List.of(
                new DocumentSubmissionItem("JSON", built.sha256Hash(), built.codeNumber(), built.base64Document())
        ));
        return myInvoisSubmissionClient.submitDocuments(accessToken, request);
    }

    @Transactional
    public SubmissionResponse refreshStatus(Long submissionId, Long userId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new EntityNotFoundException("Submission not found: " + submissionId));

        MappedInvoice mappedInvoice = null;
        ConsolidatedInvoice consolidatedInvoice = null;
        if (submission.getMappedInvoiceId() != null) {
            mappedInvoice = invoiceReviewService.getOwned(submission.getMappedInvoiceId(), userId);
        } else {
            consolidatedInvoice = consolidationService.getOwned(submission.getConsolidatedInvoiceId(), userId);
        }

        String accessToken = myInvoisAuthService.getAccessToken(userId);
        SubmissionStatusResponse status = myInvoisSubmissionClient.getSubmissionStatus(accessToken, submission.getMyInvoisSubmissionUid());

        submission.setStatus(mapStatus(status.overallStatus()));
        submission.setStatusUpdatedAt(Instant.now());

        // The status endpoint only reports Valid/Invalid; it never says why. For an invalid document
        // fetch the per-step validation results, which carry the actual reason (e.g. ERR406), and
        // store those as the payload so the reason reaches the frontend.
        if (submission.getMyInvoisDocumentUuid() == null) {
            submission.setMyInvoisDocumentUuid(firstDocumentUuid(status));
        }
        String payloadJson = toJson(status);
        if (submission.getStatus() == SubmissionStatus.INVALID && submission.getMyInvoisDocumentUuid() != null) {
            try {
                String details = myInvoisSubmissionClient.getDocumentDetails(
                        accessToken, submission.getMyInvoisDocumentUuid());
                if (details != null && !details.isBlank()) {
                    payloadJson = details;
                }
            } catch (Exception e) {
                log.warn("Could not fetch document details for {}: {}",
                        submission.getMyInvoisDocumentUuid(), e.getMessage());
            }
        }
        submission.setResponsePayload(payloadJson);
        submission = submissionRepository.save(submission);

        if (mappedInvoice != null) {
            if (submission.getStatus() == SubmissionStatus.VALID) {
                mappedInvoice.setStatus(InvoiceStatus.ACCEPTED);
            } else if (submission.getStatus() == SubmissionStatus.INVALID) {
                mappedInvoice.setStatus(InvoiceStatus.REJECTED);
            }
            mappedInvoiceRepository.save(mappedInvoice);
        } else {
            if (submission.getStatus() == SubmissionStatus.VALID) {
                consolidatedInvoice.setStatus(ConsolidatedInvoiceStatus.ACCEPTED);
            } else if (submission.getStatus() == SubmissionStatus.INVALID) {
                consolidatedInvoice.setStatus(ConsolidatedInvoiceStatus.REJECTED);
            }
            consolidatedInvoiceRepository.save(consolidatedInvoice);
        }

        return toResponse(submission);
    }

    public List<SubmissionResponse> listForInvoice(Long mappedInvoiceId, Long userId) {
        invoiceReviewService.getOwned(mappedInvoiceId, userId);
        return submissionRepository.findByMappedInvoiceId(mappedInvoiceId).stream()
                .map(this::toResponse)
                .toList();
    }

    public List<SubmissionResponse> listForConsolidatedInvoice(Long consolidatedInvoiceId, Long userId) {
        consolidationService.getOwned(consolidatedInvoiceId, userId);
        return submissionRepository.findByConsolidatedInvoiceId(consolidatedInvoiceId).stream()
                .map(this::toResponse)
                .toList();
    }

    private String acceptedDocumentUuid(SubmitDocumentsResponse response) {
        if (response == null || response.acceptedDocuments() == null || response.acceptedDocuments().isEmpty()) {
            return null;
        }
        return response.acceptedDocuments().get(0).uuid();
    }

    private String firstDocumentUuid(SubmissionStatusResponse status) {
        if (status == null || status.documentSummary() == null || status.documentSummary().isEmpty()) {
            return null;
        }
        return status.documentSummary().get(0).uuid();
    }

    private SubmissionStatus mapStatus(String overallStatus) {
        if (overallStatus == null) {
            return SubmissionStatus.PENDING;
        }
        try {
            return SubmissionStatus.valueOf(overallStatus.toUpperCase());
        } catch (IllegalArgumentException e) {
            return SubmissionStatus.IN_PROGRESS;
        }
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{}";
        }
    }

    /**
     * Best-effort extraction of a human-readable rejection reason from a stored
     * {@code SubmitDocumentsResponse} payload's {@code rejectedDocuments[].error.message} — neither
     * individual nor consolidated invoices surfaced this to the frontend before; both get it for
     * free now that this is the one shared response-mapping method for both flows.
     */
    private String extractErrorMessage(String responsePayloadJson) {
        if (responsePayloadJson == null) {
            return null;
        }
        try {
            JsonNode root = objectMapper.readTree(responsePayloadJson);
            // A document-details payload (stored for Invalid docs on refresh) carries the real
            // step-level reason under validationResults.validationSteps[].error; prefer it.
            String stepMessage = extractValidationStepErrors(root);
            if (stepMessage != null) {
                return stepMessage;
            }
            JsonNode rejected = root.path("rejectedDocuments");
            if (!rejected.isArray() || rejected.isEmpty()) {
                return null;
            }
            List<String> messages = new ArrayList<>();
            for (JsonNode doc : rejected) {
                JsonNode error = doc.path("error");
                String message = error.path("message").asText(null);
                // LHDN's top-level message is often just "Validation Error"; the actionable, field-level
                // reasons live under error.details[]. Surface those so the user sees what actually failed.
                List<String> detailMessages = new ArrayList<>();
                for (JsonNode detail : error.path("details")) {
                    String detailMessage = detail.path("message").asText(null);
                    if (detailMessage == null || detailMessage.isBlank()) {
                        continue;
                    }
                    String target = detail.path("target").asText(null);
                    detailMessages.add(target == null || target.isBlank()
                            ? detailMessage
                            : target + ": " + detailMessage);
                }
                if (!detailMessages.isEmpty()) {
                    String joinedDetails = String.join(", ", detailMessages);
                    messages.add(message == null ? joinedDetails : message + " (" + joinedDetails + ")");
                } else if (message != null) {
                    messages.add(message);
                }
            }
            return messages.isEmpty() ? null : String.join("; ", messages);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Pulls the reason(s) out of a document-details payload's
     * {@code validationResults.validationSteps[]}, naming each failing step and its error code,
     * e.g. "Step05-Taxpayer Profile Validator: ERR406 Buyer TIN is invalid...".
     */
    private String extractValidationStepErrors(JsonNode root) {
        JsonNode steps = root.path("validationResults").path("validationSteps");
        if (!steps.isArray() || steps.isEmpty()) {
            return null;
        }
        List<String> messages = new ArrayList<>();
        for (JsonNode step : steps) {
            JsonNode error = step.path("error");
            if (error.isMissingNode() || error.isNull()) {
                continue;
            }
            // Prefer the granular reasons nested under innerError/details (e.g. ERR406 "Buyer TIN is
            // invalid...") over the generic top-level step error (e.g. Error05 "Invalid Taxpayer
            // Profile Validator"); fall back to the top-level message if there is no nested detail.
            List<String> leaves = new ArrayList<>();
            collectLeafErrors(error, leaves);
            if (leaves.isEmpty()) {
                continue;
            }
            String stepName = step.path("name").asText(null);
            String joined = String.join(", ", leaves);
            messages.add(stepName == null || stepName.isBlank() ? joined : stepName + ": " + joined);
        }
        return messages.isEmpty() ? null : String.join("; ", messages);
    }

    /** Walks an LHDN error node, descending into {@code innerError}/{@code details} so the most
     *  specific error codes/messages win; a node with no children contributes its own message. */
    private void collectLeafErrors(JsonNode error, List<String> out) {
        if (error == null || error.isMissingNode() || error.isNull()) {
            return;
        }
        List<JsonNode> children = new ArrayList<>();
        for (String childField : List.of("innerError", "details")) {
            JsonNode child = error.path(childField);
            if (child.isArray()) {
                child.forEach(children::add);
            } else if (child.isObject()) {
                children.add(child);
            }
        }
        int before = out.size();
        for (JsonNode child : children) {
            collectLeafErrors(child, out);
        }
        if (out.size() > before) {
            return; // children already contributed more specific messages
        }
        String message = firstNonBlank(error.path("error").asText(null), error.path("message").asText(null));
        if (message == null) {
            return;
        }
        String code = firstNonBlank(error.path("errorCode").asText(null), error.path("code").asText(null));
        out.add(code == null ? message : code + " " + message);
    }

    private String firstNonBlank(String a, String b) {
        if (a != null && !a.isBlank()) {
            return a;
        }
        return b != null && !b.isBlank() ? b : null;
    }

    public SubmissionResponse toResponse(Submission submission) {
        return new SubmissionResponse(submission.getId(), submission.getMappedInvoiceId(),
                submission.getConsolidatedInvoiceId(), submission.getMyInvoisSubmissionUid(),
                submission.getMyInvoisDocumentUuid(), submission.getStatus(), submission.getSubmittedAt(),
                submission.getStatusUpdatedAt(), extractErrorMessage(submission.getResponsePayload()));
    }
}
