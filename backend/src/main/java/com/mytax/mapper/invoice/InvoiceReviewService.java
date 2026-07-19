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

    public InvoiceReviewService(MappedInvoiceRepository mappedInvoiceRepository,
                                 MappedInvoiceLineItemRepository lineItemRepository,
                                 DocumentService documentService) {
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.documentService = documentService;
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

    @Transactional
    public MappedInvoiceResponse update(Long mappedInvoiceId, Long userId, UpdateMappedInvoiceRequest request) {
        MappedInvoice invoice = getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be edited (current status: " + invoice.getStatus() + ")");
        }

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
                MappedInvoiceLineItem lineItem = item.id() != null
                        ? lineItemRepository.findById(item.id())
                            .orElseThrow(() -> new EntityNotFoundException("Line item not found: " + item.id()))
                        : MappedInvoiceLineItem.builder().mappedInvoiceId(invoice.getId()).build();

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

        return toResponse(invoice);
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
                invoice.getStatus(), invoice.getConfidenceScore(), items);
    }
}
