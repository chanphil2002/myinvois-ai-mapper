package com.mytax.mapper.invoice;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.invoice.dto.UpdateMappedInvoiceRequest;
import com.mytax.mapper.mapping.InvoiceStatus;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.mapping.MappedInvoiceLineItemRepository;
import com.mytax.mapper.mapping.MappedInvoiceRepository;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class InvoiceReviewService {

    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;
    private final DocumentService documentService;
    private final SubmissionRepository submissionRepository;

    public InvoiceReviewService(MappedInvoiceRepository mappedInvoiceRepository,
                                 MappedInvoiceLineItemRepository lineItemRepository,
                                 DocumentService documentService,
                                 SubmissionRepository submissionRepository) {
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.documentService = documentService;
        this.submissionRepository = submissionRepository;
    }

    public MappedInvoice getOwned(Long mappedInvoiceId, Long userId) {
        MappedInvoice invoice = mappedInvoiceRepository.findById(mappedInvoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Mapped invoice not found: " + mappedInvoiceId));
        documentService.getOwned(invoice.getDocumentId(), userId);
        return invoice;
    }

    public MappedInvoiceResponse getOwnedResponse(Long mappedInvoiceId, Long userId) {
        return toResponse(getOwned(mappedInvoiceId, userId));
    }

    /** All of the user's mapped invoices (including manually-keyed ones), newest first. */
    public List<MappedInvoiceResponse> listForUser(Long userId) {
        return mappedInvoiceRepository.findAllForUser(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public MappedInvoiceResponse update(Long mappedInvoiceId, Long userId, UpdateMappedInvoiceRequest request) {
        MappedInvoice invoice = getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be edited (current status: " + invoice.getStatus() + ")");
        }
        return toResponse(applyRequest(invoice, request));
    }

    /**
     * Creates a DRAFT invoice from manually keyed-in data, backed by a placeholder "manual"
     * document so it flows through the same edit/confirm/submit pipeline as an AI-mapped one.
     */
    @Transactional
    public MappedInvoiceResponse createManual(Long userId, UpdateMappedInvoiceRequest request) {
        var document = documentService.createManual(userId, "Manual entry — individual invoice");
        MappedInvoice invoice = MappedInvoice.builder()
                .documentId(document.getId())
                .status(InvoiceStatus.DRAFT)
                .invoiceTypeCode(request.invoiceTypeCode() != null ? request.invoiceTypeCode() : "01")
                .currencyCode(request.currencyCode() != null ? request.currencyCode() : "MYR")
                .build();
        invoice = mappedInvoiceRepository.save(invoice);
        return toResponse(applyRequest(invoice, request));
    }

    /**
     * Starts a credit note (invoice type 02) for an issued invoice — the way to correct an e-invoice
     * after LHDN's 72-hour cancellation window. It copies the buyer and line items so the user only
     * edits the amounts being credited; on submission it references the original document's internal
     * ID and LHDN UUID (BillingReference).
     */
    @Transactional
    public MappedInvoiceResponse createCreditNote(Long originalId, Long userId) {
        MappedInvoice original = getOwned(originalId, userId);
        if (!"01".equals(original.getInvoiceTypeCode()) || original.getStatus() != InvoiceStatus.ACCEPTED) {
            throw new IllegalStateException("A credit note can only be issued for an invoice LHDN has accepted");
        }
        Submission issued = submissionRepository.findByMappedInvoiceId(originalId).stream()
                .filter(s -> s.getStatus() == SubmissionStatus.VALID && s.getMyInvoisDocumentUuid() != null)
                .reduce((a, b) -> b)
                .orElseThrow(() -> new IllegalStateException("No validated LHDN document found for this invoice"));

        String label = original.getInvoiceName() != null && !original.getInvoiceName().isBlank()
                ? original.getInvoiceName() : "Invoice #" + original.getId();
        MappedInvoice note = MappedInvoice.builder()
                .documentId(original.getDocumentId())
                .status(InvoiceStatus.DRAFT)
                .invoiceTypeCode("02")
                .currencyCode(original.getCurrencyCode())
                .build();
        note.setInvoiceName("Credit note — " + label);
        note.setOriginalInvoiceId(original.getId());
        note.setOriginalDocumentUuid(issued.getMyInvoisDocumentUuid());
        note.setOriginalInternalId(issued.getInternalId() != null ? issued.getInternalId() : "INV-" + original.getId());
        note.setSupplierTin(original.getSupplierTin());
        note.setSupplierName(original.getSupplierName());
        note.setBuyerTin(original.getBuyerTin());
        note.setBuyerName(original.getBuyerName());
        note.setBuyerIdType(original.getBuyerIdType());
        note.setBuyerIdValue(original.getBuyerIdValue());
        note.setBuyerSst(original.getBuyerSst());
        note.setBuyerAddressLine1(original.getBuyerAddressLine1());
        note.setBuyerAddressLine2(original.getBuyerAddressLine2());
        note.setBuyerCity(original.getBuyerCity());
        note.setBuyerPostalZone(original.getBuyerPostalZone());
        note.setBuyerStateCode(original.getBuyerStateCode());
        note.setBuyerCountryCode(original.getBuyerCountryCode());
        note.setBuyerPhone(original.getBuyerPhone());
        note.setBuyerEmail(original.getBuyerEmail());
        note.setSubtotal(original.getSubtotal());
        note.setTaxTotal(original.getTaxTotal());
        note.setGrandTotal(original.getGrandTotal());
        note.setDiscountTotal(original.getDiscountTotal());
        note = mappedInvoiceRepository.save(note);

        int lineNo = 1;
        for (MappedInvoiceLineItem li : lineItemRepository.findByMappedInvoiceIdOrderByLineNo(original.getId())) {
            lineItemRepository.save(MappedInvoiceLineItem.builder()
                    .mappedInvoiceId(note.getId())
                    .lineNo(lineNo++)
                    .description(li.getDescription())
                    .quantity(li.getQuantity())
                    .unitPrice(li.getUnitPrice())
                    .taxAmount(li.getTaxAmount())
                    .classificationCode(li.getClassificationCode())
                    .unitCode(li.getUnitCode())
                    .build());
        }
        return toResponse(note);
    }

    /** Copies all editable fields + line items from the request onto {@code invoice}. Shared by
     *  manual-create and edit so the two never drift. */
    private MappedInvoice applyRequest(MappedInvoice invoice, UpdateMappedInvoiceRequest request) {
        invoice.setInvoiceName(request.invoiceName());
        invoice.setInvoiceTypeCode(request.invoiceTypeCode());
        invoice.setIssueDate(request.issueDate());
        invoice.setCurrencyCode(request.currencyCode());
        invoice.setSupplierTin(request.supplierTin());
        invoice.setSupplierName(request.supplierName());
        invoice.setBuyerTin(request.buyerTin());
        invoice.setBuyerName(request.buyerName());
        invoice.setBuyerIdType(request.buyerIdType());
        invoice.setBuyerIdValue(request.buyerIdValue());
        invoice.setBuyerSst(request.buyerSst());
        invoice.setBuyerAddressLine1(request.buyerAddressLine1());
        invoice.setBuyerAddressLine2(request.buyerAddressLine2());
        invoice.setBuyerCity(request.buyerCity());
        invoice.setBuyerPostalZone(request.buyerPostalZone());
        invoice.setBuyerStateCode(request.buyerStateCode());
        invoice.setBuyerCountryCode(request.buyerCountryCode());
        invoice.setBuyerPhone(request.buyerPhone());
        invoice.setBuyerEmail(request.buyerEmail());
        invoice.setSubtotal(request.subtotal());
        invoice.setTaxTotal(request.taxTotal());
        invoice.setGrandTotal(request.grandTotal());
        invoice.setDiscountTotal(request.discountTotal());
        invoice = mappedInvoiceRepository.save(invoice);

        if (request.lineItems() != null) {
            int lineNo = 1;
            for (UpdateMappedInvoiceRequest.LineItem item : request.lineItems()) {
                Long invoiceId = invoice.getId();
                MappedInvoiceLineItem lineItem = item.id() != null
                        ? lineItemRepository.findById(item.id())
                            .orElseThrow(() -> new EntityNotFoundException("Line item not found: " + item.id()))
                        : MappedInvoiceLineItem.builder().mappedInvoiceId(invoiceId).build();

                lineItem.setLineNo(lineNo++);
                lineItem.setDescription(item.description());
                lineItem.setQuantity(item.quantity());
                lineItem.setUnitPrice(item.unitPrice());
                lineItem.setTaxAmount(item.taxAmount());
                lineItem.setClassificationCode(item.classificationCode());
                lineItem.setUnitCode(item.unitCode() != null ? item.unitCode() : "C62");
                lineItemRepository.save(lineItem);
            }
        }
        return invoice;
    }

    @Transactional
    public MappedInvoiceResponse confirm(Long mappedInvoiceId, Long userId) {
        MappedInvoice invoice = getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be confirmed (current status: " + invoice.getStatus() + ")");
        }
        invoice.setStatus(InvoiceStatus.CONFIRMED);
        invoice = mappedInvoiceRepository.save(invoice);
        return toResponse(invoice);
    }

    private MappedInvoiceResponse toResponse(MappedInvoice invoice) {
        List<MappedInvoiceLineItem> lineItems = lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId());
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
                invoice.getStatus(), invoice.getConfidenceScore(), items, invoice.getCreatedAt(),
                invoice.getInvoiceName(),
                invoice.getOriginalInvoiceId(), invoice.getOriginalInternalId());
    }
}
