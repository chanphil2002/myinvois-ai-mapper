package com.mytax.mapper.mapping;

import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.document.DocumentStatus;
import com.mytax.mapper.document.FileStorageService;
import com.mytax.mapper.mapping.dto.MappedInvoiceDraft;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Service
public class MappingService {

    private final DocumentService documentService;
    private final FileStorageService fileStorageService;
    private final MappingEngine mappingEngine;
    private final ExtractionJobRepository extractionJobRepository;
    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;

    public MappingService(DocumentService documentService,
                           FileStorageService fileStorageService,
                           MappingEngine mappingEngine,
                           ExtractionJobRepository extractionJobRepository,
                           MappedInvoiceRepository mappedInvoiceRepository,
                           MappedInvoiceLineItemRepository lineItemRepository) {
        this.documentService = documentService;
        this.fileStorageService = fileStorageService;
        this.mappingEngine = mappingEngine;
        this.extractionJobRepository = extractionJobRepository;
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
    }

    @Transactional
    public MappedInvoiceResponse runMapping(Long documentId, Long userId) {
        Document document = documentService.getOwned(documentId, userId);

        ExtractionJob job = ExtractionJob.builder()
                .documentId(documentId)
                .status(ExtractionJobStatus.RUNNING)
                .startedAt(Instant.now())
                .build();
        job = extractionJobRepository.save(job);

        try {
            byte[] fileBytes = fileStorageService.load(document.getStoragePath());
            MappingEngine.MappingResult result = mappingEngine.map(document, fileBytes);

            job.setStatus(ExtractionJobStatus.COMPLETED);
            job.setAiModel(result.modelName());
            job.setRawAiResponse(result.rawResponseJson());
            job.setCompletedAt(Instant.now());
            extractionJobRepository.save(job);

            document.setStatus(DocumentStatus.PARSED);

            MappedInvoice mappedInvoice = persistDraft(document, job.getId(), result.draft());
            return toResponse(mappedInvoice, lineItemRepository.findByMappedInvoiceIdOrderByLineNo(mappedInvoice.getId()));
        } catch (Exception e) {
            job.setStatus(ExtractionJobStatus.FAILED);
            job.setErrorMessage(e.getMessage());
            job.setCompletedAt(Instant.now());
            extractionJobRepository.save(job);

            document.setStatus(DocumentStatus.FAILED);
            throw new IllegalStateException("AI mapping failed: " + e.getMessage(), e);
        }
    }

    public List<MappedInvoiceResponse> listForDocument(Long documentId, Long userId) {
        documentService.getOwned(documentId, userId);
        return mappedInvoiceRepository.findByDocumentId(documentId).stream()
                .map(invoice -> toResponse(invoice, lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId())))
                .toList();
    }

    private MappedInvoice persistDraft(Document document, Long extractionJobId, MappedInvoiceDraft draft) {
        MappedInvoice invoice = MappedInvoice.builder()
                .documentId(document.getId())
                .extractionJobId(extractionJobId)
                .invoiceTypeCode(draft.invoiceTypeCode() != null ? draft.invoiceTypeCode() : "01")
                .issueDate(draft.issueDate())
                .currencyCode(draft.currencyCode() != null ? draft.currencyCode() : "MYR")
                .supplierTin(draft.supplierTin())
                .supplierName(draft.supplierName())
                .buyerTin(draft.buyerTin())
                .buyerName(draft.buyerName())
                .buyerIdType(draft.buyerIdType())
                .buyerIdValue(draft.buyerIdValue())
                .buyerSst(draft.buyerSst())
                .buyerAddressLine1(draft.buyerAddressLine1())
                .buyerAddressLine2(draft.buyerAddressLine2())
                .buyerCity(draft.buyerCity())
                .buyerPostalZone(draft.buyerPostalZone())
                .buyerStateCode(draft.buyerStateCode())
                .buyerCountryCode(draft.buyerCountryCode())
                .buyerPhone(draft.buyerPhone())
                .buyerEmail(draft.buyerEmail())
                .subtotal(draft.subtotal())
                .taxTotal(draft.taxTotal())
                .grandTotal(draft.grandTotal())
                .discountTotal(draft.discountTotal())
                .status(InvoiceStatus.DRAFT)
                .confidenceScore(draft.confidenceScore())
                .build();
        invoice = mappedInvoiceRepository.save(invoice);

        int lineNo = 1;
        if (draft.lineItems() != null) {
            for (MappedInvoiceDraft.LineItemDraft item : draft.lineItems()) {
                MappedInvoiceLineItem lineItem = MappedInvoiceLineItem.builder()
                        .mappedInvoiceId(invoice.getId())
                        .lineNo(lineNo++)
                        .description(item.description())
                        .quantity(item.quantity() != null ? item.quantity() : BigDecimal.ONE)
                        .unitPrice(item.unitPrice() != null ? item.unitPrice() : BigDecimal.ZERO)
                        .taxAmount(item.taxAmount() != null ? item.taxAmount() : BigDecimal.ZERO)
                        .classificationCode(item.classificationCode())
                        .unitCode(normalizeUnitCode(item.unitCode()))
                        .confidenceScore(item.confidenceScore())
                        .build();
                lineItemRepository.save(lineItem);
            }
        }
        return invoice;
    }

    /**
     * unit_code is VARCHAR(10) (it's meant to hold a short UN/ECE-style unit code or abbreviation).
     * Defends against any AI provider returning an oversized value that would otherwise fail the
     * insert with a SQL truncation error.
     */
    private String normalizeUnitCode(String unitCode) {
        if (unitCode == null || unitCode.isBlank() || unitCode.length() > 10) {
            return "C62";
        }
        return unitCode;
    }

    private MappedInvoiceResponse toResponse(MappedInvoice invoice, List<MappedInvoiceLineItem> lineItems) {
        List<MappedInvoiceResponse.LineItemResponse> items = lineItems.stream()
                .map(li -> new MappedInvoiceResponse.LineItemResponse(li.getId(), li.getLineNo(), li.getDescription(),
                        li.getQuantity(), li.getUnitPrice(), li.getTaxAmount(), li.getClassificationCode(),
                        li.getUnitCode(), li.getConfidenceScore()))
                .toList();

        return new MappedInvoiceResponse(invoice.getId(), invoice.getDocumentId(), invoice.getInvoiceTypeCode(),
                invoice.getIssueDate(), invoice.getCurrencyCode(), invoice.getSupplierTin(), invoice.getSupplierName(),
                invoice.getBuyerTin(), invoice.getBuyerName(), invoice.getBuyerIdType(), invoice.getBuyerIdValue(),
                invoice.getBuyerSst(), invoice.getBuyerAddressLine1(), invoice.getBuyerAddressLine2(),
                invoice.getBuyerCity(), invoice.getBuyerPostalZone(), invoice.getBuyerStateCode(),
                invoice.getBuyerCountryCode(), invoice.getBuyerPhone(), invoice.getBuyerEmail(),
                invoice.getSubtotal(), invoice.getTaxTotal(), invoice.getGrandTotal(), invoice.getDiscountTotal(),
                invoice.getStatus(), invoice.getConfidenceScore(), items);
    }
}
