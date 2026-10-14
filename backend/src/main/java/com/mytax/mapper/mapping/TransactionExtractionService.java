package com.mytax.mapper.mapping;

import com.mytax.mapper.consolidation.ConsolidationEligibilityService;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.document.DocumentStatus;
import com.mytax.mapper.document.FileStorageService;
import com.mytax.mapper.mapping.dto.SalesTransactionDraft;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.Arrays;

/**
 * Consolidated-mode counterpart to {@link MappingService}: same AI-extraction/{@link ExtractionJob}
 * lifecycle shape, but produces many {@link SalesTransaction} rows per document instead of one
 * {@link MappedInvoice}. See {@code ConsolidationService} for what happens to these afterwards
 * (grouping into a {@code ConsolidatedInvoice}).
 */
@Service
public class TransactionExtractionService {

    private static final Logger log = LoggerFactory.getLogger(TransactionExtractionService.class);

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
        usageService.requireAllowance(userId); // usage itself is metered per AI call by the engine

        ExtractionJob job = extractionJobSupport.start(documentId);

        try {
            byte[] fileBytes = fileStorageService.load(document.getStoragePath());
            MappingEngine.TransactionExtractionResult result = mappingEngine.mapTransactions(document, fileBytes);

            extractionJobSupport.complete(job, result.modelName(), result.rawResponseJson());
            document.setStatus(DocumentStatus.PARSED);

            List<SalesTransaction> transactions = persistDrafts(document, job.getId(),
                    dropItemisedRows(document, dropRepeatedReceiptRows(document, result.drafts())));
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

    /**
     * Safety net for the "same sale listed twice" failure on receipt images/PDFs (see
     * docs/AI_PARSING_ERRORS.md): rows identical in every field are model repetition, not two sales.
     * Spreadsheets/CSVs are left alone — two identical rows there can be two genuine sales.
     */
    private List<SalesTransactionDraft> dropRepeatedReceiptRows(Document document, List<SalesTransactionDraft> drafts) {
        String type = document.getFileType() == null ? "" : document.getFileType().toLowerCase();
        if (Set.of("xlsx", "xls", "csv", "tsv", "txt").contains(type)) {
            return drafts;
        }
        Set<List<Object>> seen = new HashSet<>();
        List<SalesTransactionDraft> unique = new ArrayList<>();
        for (SalesTransactionDraft d : drafts) {
            List<Object> key = Arrays.asList(d.transactionDate(), normalize(d.description()), scaled(d.quantity()),
                    scaled(d.unitPrice()), scaled(d.taxAmount()), d.buyerName(), d.buyerTin());
            if (seen.add(key)) {
                unique.add(d);
            }
        }
        if (unique.size() < drafts.size()) {
            log.warn("Dropped {} repeated row(s) from AI extraction of document {}",
                    drafts.size() - unique.size(), document.getId());
        }
        return unique;
    }

    private static final BigDecimal ROLLUP_TOLERANCE = new BigDecimal("0.05");

    /**
     * Safety net for the "receipt total + its items" failure (docs/AI_PARSING_ERRORS.md): the model
     * returns the receipt as one row AND lists its items as extra rows, double-counting the sale.
     * If one row's amount equals the sum of all the other rows, and those rows are clearly its items
     * (their descriptions appear in its description, or they carry no date of their own), keep only
     * the receipt row. Image/PDF documents only — spreadsheets are never collapsed.
     */
    private List<SalesTransactionDraft> dropItemisedRows(Document document, List<SalesTransactionDraft> drafts) {
        String type = document.getFileType() == null ? "" : document.getFileType().toLowerCase();
        if (drafts.size() < 3 || Set.of("xlsx", "xls", "csv", "tsv", "txt").contains(type)) {
            return drafts;
        }
        for (SalesTransactionDraft receipt : drafts) {
            List<SalesTransactionDraft> others = drafts.stream().filter(d -> d != receipt).toList();
            BigDecimal itemsTotal = others.stream().map(TransactionExtractionService::lineAmount)
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            if (lineAmount(receipt).subtract(itemsTotal).abs().compareTo(ROLLUP_TOLERANCE) > 0) {
                continue;
            }
            String receiptText = normalize(receipt.description()) == null ? "" : normalize(receipt.description());
            boolean namedInReceipt = others.stream().allMatch(d -> d.description() != null
                    && receiptText.contains(normalize(d.description())));
            boolean undatedItems = receipt.transactionDate() != null
                    && others.stream().allMatch(d -> d.transactionDate() == null);
            if (namedInReceipt || undatedItems) {
                log.warn("Document {}: dropped {} item row(s) that duplicated receipt row \"{}\"",
                        document.getId(), others.size(), receipt.description());
                return List.of(receipt);
            }
        }
        return drafts;
    }

    private static BigDecimal lineAmount(SalesTransactionDraft d) {
        BigDecimal qty = d.quantity() != null ? d.quantity() : BigDecimal.ONE;
        BigDecimal price = d.unitPrice() != null ? d.unitPrice() : BigDecimal.ZERO;
        return qty.multiply(price);
    }

    private static String normalize(String text) {
        return text == null ? null : text.trim().replaceAll("\\s+", " ").toLowerCase();
    }

    private static BigDecimal scaled(BigDecimal value) {
        return value == null ? null : value.stripTrailingZeros();
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
                t.getBuyerName(), t.getBuyerTin(), t.isEligibleForConsolidation(), t.getStatus(), t.getConfidenceScore(),
                t.getExtractionJobId() != null);
    }
}
