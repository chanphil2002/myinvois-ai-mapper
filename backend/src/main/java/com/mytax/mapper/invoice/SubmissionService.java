package com.mytax.mapper.invoice;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.common.EntityNotFoundException;
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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class SubmissionService {

    private final InvoiceReviewService invoiceReviewService;
    private final UblDocumentBuilder ublDocumentBuilder;
    private final MyInvoisAuthService myInvoisAuthService;
    private final MyInvoisSubmissionClient myInvoisSubmissionClient;
    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;
    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public SubmissionService(InvoiceReviewService invoiceReviewService,
                              UblDocumentBuilder ublDocumentBuilder,
                              MyInvoisAuthService myInvoisAuthService,
                              MyInvoisSubmissionClient myInvoisSubmissionClient,
                              MappedInvoiceRepository mappedInvoiceRepository,
                              MappedInvoiceLineItemRepository lineItemRepository,
                              SubmissionRepository submissionRepository,
                              ObjectMapper objectMapper) {
        this.invoiceReviewService = invoiceReviewService;
        this.ublDocumentBuilder = ublDocumentBuilder;
        this.myInvoisAuthService = myInvoisAuthService;
        this.myInvoisSubmissionClient = myInvoisSubmissionClient;
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.submissionRepository = submissionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubmissionResponse submit(Long mappedInvoiceId, Long userId) {
        MappedInvoice invoice = invoiceReviewService.getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw new IllegalStateException("Invoice must be CONFIRMED before submission (current status: " + invoice.getStatus() + ")");
        }

        List<MappedInvoiceLineItem> lineItems = lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId());
        UblDocumentBuilder.BuiltDocument built = ublDocumentBuilder.build(invoice, lineItems);

        String accessToken = myInvoisAuthService.getAccessToken(userId);
        SubmitDocumentsRequest request = new SubmitDocumentsRequest(List.of(
                new DocumentSubmissionItem("JSON", built.sha256Hash(), built.codeNumber(), built.base64Document())
        ));

        SubmitDocumentsResponse response = myInvoisSubmissionClient.submitDocuments(accessToken, request);

        Submission submission = Submission.builder()
                .mappedInvoiceId(invoice.getId())
                .myInvoisSubmissionUid(response.submissionUid())
                .status(SubmissionStatus.PENDING)
                .submittedAt(Instant.now())
                .responsePayload(toJson(response))
                .build();
        submission = submissionRepository.save(submission);

        invoice.setStatus(InvoiceStatus.SUBMITTED);
        mappedInvoiceRepository.save(invoice);

        return toResponse(submission);
    }

    @Transactional
    public SubmissionResponse refreshStatus(Long submissionId, Long userId) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new EntityNotFoundException("Submission not found: " + submissionId));
        MappedInvoice invoice = invoiceReviewService.getOwned(submission.getMappedInvoiceId(), userId);

        String accessToken = myInvoisAuthService.getAccessToken(userId);
        SubmissionStatusResponse status = myInvoisSubmissionClient.getSubmissionStatus(accessToken, submission.getMyInvoisSubmissionUid());

        submission.setStatus(mapStatus(status.overallStatus()));
        submission.setStatusUpdatedAt(Instant.now());
        submission.setResponsePayload(toJson(status));
        submission = submissionRepository.save(submission);

        if (submission.getStatus() == SubmissionStatus.VALID) {
            invoice.setStatus(InvoiceStatus.ACCEPTED);
        } else if (submission.getStatus() == SubmissionStatus.INVALID) {
            invoice.setStatus(InvoiceStatus.REJECTED);
        }
        mappedInvoiceRepository.save(invoice);

        return toResponse(submission);
    }

    public List<SubmissionResponse> listForInvoice(Long mappedInvoiceId, Long userId) {
        invoiceReviewService.getOwned(mappedInvoiceId, userId);
        return submissionRepository.findByMappedInvoiceId(mappedInvoiceId).stream()
                .map(this::toResponse)
                .toList();
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

    private SubmissionResponse toResponse(Submission submission) {
        return new SubmissionResponse(submission.getId(), submission.getMappedInvoiceId(),
                submission.getMyInvoisSubmissionUid(), submission.getMyInvoisDocumentUuid(),
                submission.getStatus(), submission.getSubmittedAt(), submission.getStatusUpdatedAt());
    }
}
