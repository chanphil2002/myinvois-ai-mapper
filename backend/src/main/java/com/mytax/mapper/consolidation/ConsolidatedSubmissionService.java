package com.mytax.mapper.consolidation;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.mytax.mapper.invoice.BuiltDocument;
import com.mytax.mapper.invoice.ConsolidatedUblDocumentBuilder;
import com.mytax.mapper.invoice.Submission;
import com.mytax.mapper.invoice.SubmissionRepository;
import com.mytax.mapper.invoice.SubmissionService;
import com.mytax.mapper.invoice.SubmissionStatus;
import com.mytax.mapper.invoice.dto.SubmissionResponse;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.mapping.SalesTransactionRepository;
import com.mytax.mapper.myinvois.dto.SubmitDocumentsResponse;
import com.mytax.mapper.profile.BusinessProfile;
import com.mytax.mapper.profile.BusinessProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

/**
 * Consolidated-invoice counterpart to {@code SubmissionService.submit()}: same MyInvois call and
 * {@link Submission} bookkeeping (via the shared {@link SubmissionService#submitBuiltDocument} and
 * {@link SubmissionService#toResponse}), only the document-building step and the owning entity
 * differ. Status refresh is handled by the existing {@code SubmissionService.refreshStatus()},
 * generalized to branch on which invoice kind a submission belongs to — there's no
 * consolidated-specific refresh method.
 */
@Service
public class ConsolidatedSubmissionService {

    private final ConsolidationService consolidationService;
    private final ConsolidatedInvoiceRepository consolidatedInvoiceRepository;
    private final ConsolidatedInvoiceTransactionRepository linkRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final BusinessProfileService businessProfileService;
    private final ConsolidatedUblDocumentBuilder ublDocumentBuilder;
    private final SubmissionService submissionService;
    private final SubmissionRepository submissionRepository;
    private final ObjectMapper objectMapper;

    public ConsolidatedSubmissionService(ConsolidationService consolidationService,
                                          ConsolidatedInvoiceRepository consolidatedInvoiceRepository,
                                          ConsolidatedInvoiceTransactionRepository linkRepository,
                                          SalesTransactionRepository salesTransactionRepository,
                                          BusinessProfileService businessProfileService,
                                          ConsolidatedUblDocumentBuilder ublDocumentBuilder,
                                          SubmissionService submissionService,
                                          SubmissionRepository submissionRepository,
                                          ObjectMapper objectMapper) {
        this.consolidationService = consolidationService;
        this.consolidatedInvoiceRepository = consolidatedInvoiceRepository;
        this.linkRepository = linkRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.businessProfileService = businessProfileService;
        this.ublDocumentBuilder = ublDocumentBuilder;
        this.submissionService = submissionService;
        this.submissionRepository = submissionRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public SubmissionResponse submit(Long consolidatedInvoiceId, Long userId) {
        ConsolidatedInvoice invoice = consolidationService.getOwned(consolidatedInvoiceId, userId);
        if (invoice.getStatus() != ConsolidatedInvoiceStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Consolidated invoice must be CONFIRMED before submission (current status: " + invoice.getStatus() + ")");
        }

        BusinessProfile supplier = businessProfileService.getOwned(userId);
        List<Long> transactionIds = linkRepository.findByConsolidatedInvoiceId(invoice.getId()).stream()
                .map(ConsolidatedInvoiceTransaction::getSalesTransactionId)
                .toList();
        List<SalesTransaction> transactions = salesTransactionRepository.findByIdIn(transactionIds);

        BuiltDocument built = ublDocumentBuilder.build(supplier, invoice, transactions);
        SubmitDocumentsResponse response = submissionService.submitBuiltDocument(userId, built);

        Submission submission = Submission.builder()
                .consolidatedInvoiceId(invoice.getId())
                .myInvoisSubmissionUid(response.submissionUid())
                .status(SubmissionStatus.PENDING)
                .submittedAt(Instant.now())
                .responsePayload(toJson(response))
                .build();
        submission = submissionRepository.save(submission);

        invoice.setStatus(ConsolidatedInvoiceStatus.SUBMITTED);
        consolidatedInvoiceRepository.save(invoice);

        return submissionService.toResponse(submission);
    }

    public List<SubmissionResponse> listForConsolidatedInvoice(Long consolidatedInvoiceId, Long userId) {
        return submissionService.listForConsolidatedInvoice(consolidatedInvoiceId, userId);
    }

    private String toJson(Object payload) {
        try {
            return objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            return "{}";
        }
    }
}
