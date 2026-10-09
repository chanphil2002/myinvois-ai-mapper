package com.mytax.mapper.mapping;

import com.mytax.mapper.consolidation.ConsolidationEligibilityService;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.document.DocumentStatus;
import com.mytax.mapper.document.FileStorageService;
import com.mytax.mapper.mapping.dto.SalesTransactionDraft;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Consolidated-mode counterpart to {@link MappingService}: same AI-extraction/{@link ExtractionJob}
 * lifecycle shape, but produces many {@link SalesTransaction} rows per document instead of one
 * {@link MappedInvoice}. See {@code ConsolidationService} for what happens to these afterwards
 * (grouping into a {@code ConsolidatedInvoice}).
 */
@Service
public class TransactionExtractionService {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final MappingEngine mappingEngine;
    private final ExtractionJobSupport extractionJobSupport;
    private final SalesTransactionRepository salesTransactionRepository;
    private final ConsolidationEligibilityService eligibilityService;
    private final com.mytax.mapper.usage.UsageService usageService;

    public TransactionExtractionService(DocumentService documentService,
                                         FileStorageService fileStorageService,
                                         MappingEngine mappingEngine,
                                         ExtractionJobSupport extractionJobSupport,
                                         SalesTransactionRepository salesTransactionRepository,
                                         ConsolidationEligibilityService eligibilityService,
                                         com.mytax.mapper.usage.UsageService usageService) {
        this.documentService = documentService;
        this.fileStorageService = fileStorageService;
        this.mappingEngine = mappingEngine;
        this.extractionJobSupport = extractionJobSupport;
        this.salesTransactionRepository = salesTransactionRepository;
        this.eligibilityService = eligibilityService;
        this.usageService = usageService;
    }

    @Transactional
    public List<SalesTransactionResponse> extractTransactions(Long documentId, Long userId) {
        Document document = documentService.getOwned(documentId, userId);

        ExtractionJob job = extractionJobSupport.start(documentId);

        try {
            byte[] fileBytes = fileStorageService.load(document.getStoragePath());
            MappingEngine.TransactionExtractionResult result = mappingEngine.mapTransactions(document, fileBytes);

            extractionJobSupport.complete(job, result.modelName(), result.rawResponseJson());
            document.setStatus(DocumentStatus.PARSED);
            usageService.record(userId, "EXTRACTION", documentId);

            List<SalesTransaction> transactions = persistDrafts(document, job.getId(), result.drafts());
            return transactions.stream().map(this::toResponse).toList();
        } catch (Exception e) {
            extractionJobSupport.fail(job, e.getMessage());
            document.setStatus(DocumentStatus.FAILED);
            throw new IllegalStateException("AI transaction extraction failed: " + e.getMessage(), e);
        }
    }

    public List<SalesTransactionResponse> listForDocument(Long documentId, Long userId) {
        documentService.getOwned(documentId, userId);
        return salesTransactionRepository.findByDocumentIdOrderByTransactionDate(documentId).stream()
                .map(this::toResponse)
                .toList();
    }

    private List<SalesTransaction> persistDrafts(Document document, Long extractionJobId, List<SalesTransactionDraft> drafts) {
        List<SalesTransaction> saved = new ArrayList<>();
        for (SalesTransactionDraft draft : drafts) {
            SalesTransaction transaction = SalesTransaction.builder()
                    .documentId(document.getId())
                    .extractionJobId(extractionJobId)
                    .transactionDate(draft.transactionDate())
                    .description(draft.description())
                    .quantity(draft.quantity() != null ? draft.quantity() : BigDecimal.ONE)
                    .unitPrice(draft.unitPrice() != null ? draft.unitPrice() : BigDecimal.ZERO)
                    .taxAmount(draft.taxAmount() != null ? draft.taxAmount() : BigDecimal.ZERO)
                    .classificationCode(draft.classificationCode())
                    .unitCode(extractionJobSupport.normalizeUnitCode(draft.unitCode()))
                    .buyerName(draft.buyerName())
                    .buyerTin(draft.buyerTin())
                    .eligibleForConsolidation(eligibilityService.isEligible(draft))
                    .status(SalesTransactionStatus.PENDING)
                    .confidenceScore(draft.confidenceScore())
                    .build();
            saved.add(salesTransactionRepository.save(transaction));
        }
        return saved;
    }

    private SalesTransactionResponse toResponse(SalesTransaction t) {
        return new SalesTransactionResponse(t.getId(), t.getDocumentId(), t.getTransactionDate(), t.getDescription(),
                t.getQuantity(), t.getUnitPrice(), t.getTaxAmount(), t.getClassificationCode(), t.getUnitCode(),
                t.getBuyerName(), t.getBuyerTin(), t.isEligibleForConsolidation(), t.getStatus(), t.getConfidenceScore());
    }
}
