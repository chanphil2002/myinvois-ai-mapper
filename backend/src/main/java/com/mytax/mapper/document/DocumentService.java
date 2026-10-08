package com.mytax.mapper.document;

import com.mytax.mapper.billing.SubscriptionRepository;
import com.mytax.mapper.billing.SubscriptionStatus;
import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.common.QuotaExceededException;
import com.mytax.mapper.consolidation.ConsolidatedInvoiceTransactionRepository;
import com.mytax.mapper.document.dto.DocumentResponse;
import com.mytax.mapper.mapping.ExtractionJobRepository;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItemRepository;
import com.mytax.mapper.mapping.MappedInvoiceRepository;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.mapping.SalesTransactionRepository;
import com.mytax.mapper.invoice.SubmissionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@Service
public class DocumentService {

    /** Free tier (no active subscription): how many real documents may be uploaded per day. */
    private static final int FREE_DAILY_LIMIT = 2;
    private static final ZoneId BUSINESS_ZONE = ZoneId.of("Asia/Kuala_Lumpur");

    private final DocumentRepository documentRepository;
    private final FileStorageService fileStorageService;
    private final SubscriptionRepository subscriptionRepository;
    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;
    private final SubmissionRepository submissionRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final ConsolidatedInvoiceTransactionRepository consolidatedLinkRepository;
    private final ExtractionJobRepository extractionJobRepository;

    public DocumentService(DocumentRepository documentRepository, FileStorageService fileStorageService,
                           SubscriptionRepository subscriptionRepository,
                           MappedInvoiceRepository mappedInvoiceRepository,
                           MappedInvoiceLineItemRepository lineItemRepository,
                           SubmissionRepository submissionRepository,
                           SalesTransactionRepository salesTransactionRepository,
                           ConsolidatedInvoiceTransactionRepository consolidatedLinkRepository,
                           ExtractionJobRepository extractionJobRepository) {
        this.documentRepository = documentRepository;
        this.fileStorageService = fileStorageService;
        this.subscriptionRepository = subscriptionRepository;
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.submissionRepository = submissionRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.consolidatedLinkRepository = consolidatedLinkRepository;
        this.extractionJobRepository = extractionJobRepository;
    }

    @Transactional
    public DocumentResponse upload(Long userId, MultipartFile file) {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Uploaded file is empty");
        }

        enforceFreeTierDailyLimit(userId);

        String storagePath = fileStorageService.store(file);
        String fileType = resolveFileType(file.getOriginalFilename(), file.getContentType());

        Document document = Document.builder()
                .userId(userId)
                .originalFilename(file.getOriginalFilename())
                .fileType(fileType)
                .storagePath(storagePath)
                .status(DocumentStatus.UPLOADED)
                .build();

        document = documentRepository.save(document);
        return toResponse(document);
    }

    /**
     * Free-tier users (no active subscription) may upload at most {@value #FREE_DAILY_LIMIT}
     * real documents per calendar day (Malaysia time). Manual entries don't count.
     */
    private void enforceFreeTierDailyLimit(Long userId) {
        boolean subscribed = subscriptionRepository
                .findFirstByUserIdAndStatusOrderByIdDesc(userId, SubscriptionStatus.ACTIVE)
                .isPresent();
        if (subscribed) {
            return;
        }
        Instant startOfDay = LocalDate.now(BUSINESS_ZONE).atStartOfDay(BUSINESS_ZONE).toInstant();
        long usedToday = documentRepository
                .countByUserIdAndStatusNotAndUploadedAtAfter(userId, DocumentStatus.MANUAL, startOfDay);
        if (usedToday >= FREE_DAILY_LIMIT) {
            throw new QuotaExceededException(
                    "Free tier limit reached — " + FREE_DAILY_LIMIT + " documents per day. "
                            + "Upgrade your plan in Billing to upload more.");
        }
    }

    public List<DocumentResponse> list(Long userId) {
        return documentRepository.findByUserIdOrderByUploadedAtDesc(userId).stream()
                .filter(d -> d.getStatus() != DocumentStatus.MANUAL)
                .map(this::toResponse)
                .toList();
    }

    /**
     * Creates a placeholder document that backs a manually keyed-in invoice or set of
     * transactions (there is no uploaded file). Lets manual entries reuse the document-scoped
     * ownership/edit/submit pipeline unchanged. Hidden from {@link #list(Long)}.
     */
    @Transactional
    public Document createManual(Long userId, String label) {
        Document document = Document.builder()
                .userId(userId)
                .originalFilename(label != null ? label : "Manual entry")
                .fileType("manual")
                .storagePath("manual")
                .status(DocumentStatus.MANUAL)
                .build();
        return documentRepository.save(document);
    }

    /**
     * Deletes a document and everything derived from it (mapped invoices + line items, extracted
     * sales transactions, extraction jobs, and the stored file). Refuses when the derived data has
     * already left the app — an invoice submitted to MyInvois, or a transaction rolled into a
     * consolidated invoice — so audit/submission records are never silently discarded.
     */
    @Transactional
    public void delete(Long documentId, Long userId) {
        Document document = getOwned(documentId, userId);

        List<MappedInvoice> invoices = mappedInvoiceRepository.findByDocumentId(documentId);
        for (MappedInvoice invoice : invoices) {
            if (!submissionRepository.findByMappedInvoiceId(invoice.getId()).isEmpty()) {
                throw new IllegalArgumentException(
                        "This document has an invoice that was submitted to MyInvois, so it can't be deleted.");
            }
        }

        List<SalesTransaction> transactions = salesTransactionRepository.findByDocumentIdOrderByTransactionDate(documentId);
        for (SalesTransaction tx : transactions) {
            if (consolidatedLinkRepository.existsBySalesTransactionId(tx.getId())) {
                throw new IllegalArgumentException(
                        "This document's transactions are part of a consolidated invoice, so it can't be deleted.");
            }
        }

        for (MappedInvoice invoice : invoices) {
            lineItemRepository.deleteAll(lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId()));
        }
        mappedInvoiceRepository.deleteAll(invoices);
        salesTransactionRepository.deleteAll(transactions);
        extractionJobRepository.deleteByDocumentId(documentId);

        documentRepository.delete(document);
        fileStorageService.delete(document.getStoragePath());
    }

    public Document getOwned(Long documentId, Long userId) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new EntityNotFoundException("Document not found: " + documentId));
        if (!document.getUserId().equals(userId)) {
            throw new EntityNotFoundException("Document not found: " + documentId);
        }
        return document;
    }

    /** A stored document's raw bytes plus a servable content type, for previewing/downloading. */
    public record DocumentFile(byte[] bytes, String contentType, String filename) {
    }

    public DocumentFile loadFile(Long documentId, Long userId) {
        Document document = getOwned(documentId, userId);
        if (document.getStatus() == DocumentStatus.MANUAL) {
            throw new EntityNotFoundException("No file for a manually keyed-in entry");
        }
        return new DocumentFile(fileStorageService.load(document.getStoragePath()),
                contentTypeFor(document.getFileType()), document.getOriginalFilename());
    }

    private String contentTypeFor(String fileType) {
        return switch (fileType == null ? "" : fileType.toLowerCase()) {
            case "png" -> "image/png";
            case "jpg", "jpeg" -> "image/jpeg";
            case "webp" -> "image/webp";
            case "gif" -> "image/gif";
            case "pdf" -> "application/pdf";
            case "xlsx" -> "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default -> "application/octet-stream";
        };
    }

    private String resolveFileType(String filename, String contentType) {
        if (filename != null && filename.contains(".")) {
            return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
        }
        return contentType != null ? contentType : "unknown";
    }

    private DocumentResponse toResponse(Document document) {
        return new DocumentResponse(document.getId(), document.getOriginalFilename(),
                document.getFileType(), document.getStatus(), document.getUploadedAt());
    }
}
