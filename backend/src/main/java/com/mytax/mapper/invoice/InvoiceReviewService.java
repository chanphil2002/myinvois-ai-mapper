package com.mytax.mapper.invoice;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.invoice.dto.UpdateMappedInvoiceRequest;
import com.mytax.mapper.mapping.InvoiceStatus;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.mapping.MappedInvoiceLineItemRepository;
import com.mytax.mapper.mapping.MappedInvoiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    @Transactional
    public MappedInvoice update(Long mappedInvoiceId, Long userId, UpdateMappedInvoiceRequest request) {
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
        invoice.setSubtotal(request.subtotal());
        invoice.setTaxTotal(request.taxTotal());
        invoice.setGrandTotal(request.grandTotal());
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
                lineItemRepository.save(lineItem);
            }
        }

        return invoice;
    }

    @Transactional
    public MappedInvoice confirm(Long mappedInvoiceId, Long userId) {
        MappedInvoice invoice = getOwned(mappedInvoiceId, userId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT) {
            throw new IllegalStateException("Only DRAFT invoices can be confirmed (current status: " + invoice.getStatus() + ")");
        }
        invoice.setStatus(InvoiceStatus.CONFIRMED);
        return mappedInvoiceRepository.save(invoice);
    }
}
