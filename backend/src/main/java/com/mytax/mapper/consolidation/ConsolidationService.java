package com.mytax.mapper.consolidation;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.consolidation.dto.ConsolidatedInvoiceResponse;
import com.mytax.mapper.consolidation.dto.CreateConsolidatedInvoiceRequest;
import com.mytax.mapper.consolidation.dto.CreateManualConsolidatedInvoiceRequest;
import com.mytax.mapper.consolidation.dto.UpdateConsolidatedInvoiceRequest;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.mapping.SalesTransaction;
import com.mytax.mapper.mapping.SalesTransactionRepository;
import com.mytax.mapper.mapping.SalesTransactionStatus;
import com.mytax.mapper.mapping.dto.SalesTransactionResponse;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Owns the "group eligible transactions into one consolidated invoice" workflow: listing
 * candidates, generating/editing a DRAFT ConsolidatedInvoice from a user-picked set of
 * SalesTransactions, and the DRAFT-only-edit / DRAFT-to-CONFIRMED pattern mirrored from
 * {@code InvoiceReviewService}. Submission itself is handled by {@code ConsolidatedSubmissionService}.
 */
@Service
public class ConsolidationService {

    private final ConsolidatedInvoiceRepository consolidatedInvoiceRepository;
    private final ConsolidatedInvoiceTransactionRepository linkRepository;
    private final SalesTransactionRepository salesTransactionRepository;
    private final DocumentService documentService;

    public ConsolidationService(ConsolidatedInvoiceRepository consolidatedInvoiceRepository,
                                 ConsolidatedInvoiceTransactionRepository linkRepository,
                                 SalesTransactionRepository salesTransactionRepository,
                                 DocumentService documentService) {
        this.consolidatedInvoiceRepository = consolidatedInvoiceRepository;
        this.linkRepository = linkRepository;
        this.salesTransactionRepository = salesTransactionRepository;
        this.documentService = documentService;
    }

    public List<SalesTransactionResponse> listEligibleTransactions(Long userId) {
        return salesTransactionRepository.findEligibleForUser(userId).stream()
                .map(this::toTransactionResponse)
                .toList();
    }

    public ConsolidatedInvoice getOwned(Long consolidatedInvoiceId, Long userId) {
        ConsolidatedInvoice invoice = consolidatedInvoiceRepository.findById(consolidatedInvoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Consolidated invoice not found: " + consolidatedInvoiceId));
        if (!invoice.getUserId().equals(userId)) {
            throw new EntityNotFoundException("Consolidated invoice not found: " + consolidatedInvoiceId);
        }
        return invoice;
    }

    public ConsolidatedInvoiceResponse getOwnedResponse(Long consolidatedInvoiceId, Long userId) {
        return toResponse(getOwned(consolidatedInvoiceId, userId));
    }

    public List<ConsolidatedInvoiceResponse> listForUser(Long userId) {
        return consolidatedInvoiceRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public ConsolidatedInvoiceResponse generate(Long userId, CreateConsolidatedInvoiceRequest request) {
        ConsolidatedInvoice invoice = ConsolidatedInvoice.builder()
                .userId(userId)
                .periodStart(request.periodStart())
                .periodEnd(request.periodEnd())
                .status(ConsolidatedInvoiceStatus.DRAFT)
                .build();
        invoice = consolidatedInvoiceRepository.save(invoice);

        applyTransactions(invoice, userId, request.transactionIds());
        return toResponse(invoice);
    }

    /**
     * Manually keyed-in consolidated invoice: creates a placeholder "manual" document, materializes
     * each keyed-in line as a B2C {@link SalesTransaction} (no buyer, consolidation-eligible), then
     * groups them into a DRAFT consolidated invoice via the same {@link #applyTransactions} path.
     */
    @Transactional
    public ConsolidatedInvoiceResponse createManual(Long userId, CreateManualConsolidatedInvoiceRequest request) {
        Document document = documentService.createManual(userId, "Manual entry — consolidated e-invoice");

        List<Long> transactionIds = new java.util.ArrayList<>();
        for (CreateManualConsolidatedInvoiceRequest.LineItem line : request.lineItems()) {
            SalesTransaction transaction = SalesTransaction.builder()
                    .documentId(document.getId())
                    .transactionDate(line.transactionDate() != null ? line.transactionDate() : request.periodEnd())
                    .description(line.description())
                    .quantity(line.quantity() != null ? line.quantity() : BigDecimal.ONE)
                    .unitPrice(line.unitPrice() != null ? line.unitPrice() : BigDecimal.ZERO)
                    .taxAmount(line.taxAmount() != null ? line.taxAmount() : BigDecimal.ZERO)
                    .unitCode(line.unitCode() != null ? line.unitCode() : "C62")
                    .eligibleForConsolidation(true)
                    .status(SalesTransactionStatus.PENDING)
                    .build();
            transaction = salesTransactionRepository.save(transaction);
            transactionIds.add(transaction.getId());
        }

        ConsolidatedInvoice invoice = ConsolidatedInvoice.builder()
                .userId(userId)
                .invoiceName(request.invoiceName())
                .periodStart(request.periodStart())
                .periodEnd(request.periodEnd())
                .status(ConsolidatedInvoiceStatus.DRAFT)
                .build();
        invoice = consolidatedInvoiceRepository.save(invoice);

        applyTransactions(invoice, userId, transactionIds);
        return toResponse(invoice);
    }

    @Transactional
    public ConsolidatedInvoiceResponse update(Long consolidatedInvoiceId, Long userId, UpdateConsolidatedInvoiceRequest request) {
        ConsolidatedInvoice invoice = getOwned(consolidatedInvoiceId, userId);
        requireDraft(invoice, "edited");

        // Release the invoice's current transactions back to PENDING before re-validating and
        // re-applying the new set, so a transaction removed from the group becomes selectable again.
        for (ConsolidatedInvoiceTransaction link : linkRepository.findByConsolidatedInvoiceId(invoice.getId())) {
            salesTransactionRepository.findById(link.getSalesTransactionId()).ifPresent(t -> {
                t.setStatus(SalesTransactionStatus.PENDING);
                salesTransactionRepository.save(t);
            });
            linkRepository.delete(link);
        }

        invoice.setPeriodStart(request.periodStart());
        invoice.setPeriodEnd(request.periodEnd());
        invoice = consolidatedInvoiceRepository.save(invoice);

        applyTransactions(invoice, userId, request.transactionIds());
        return toResponse(invoice);
    }

    @Transactional
    public ConsolidatedInvoiceResponse confirm(Long consolidatedInvoiceId, Long userId) {
        ConsolidatedInvoice invoice = getOwned(consolidatedInvoiceId, userId);
        requireDraft(invoice, "confirmed");
        invoice.setStatus(ConsolidatedInvoiceStatus.CONFIRMED);
        invoice = consolidatedInvoiceRepository.save(invoice);
        return toResponse(invoice);
    }

    /**
     * Validates ownership and grouping-eligibility of every requested transaction, links them to
     * {@code invoice}, marks each GROUPED, and recomputes the invoice's aggregate totals.
     */
    private void applyTransactions(ConsolidatedInvoice invoice, Long userId, List<Long> transactionIds) {
        List<SalesTransaction> transactions = salesTransactionRepository.findByIdIn(transactionIds);
        if (transactions.size() != transactionIds.size()) {
            throw new IllegalArgumentException("One or more transactions were not found");
        }

        transactions.stream().map(SalesTransaction::getDocumentId).distinct()
                .forEach(documentId -> documentService.getOwned(documentId, userId));

        for (SalesTransaction transaction : transactions) {
            if (transaction.getStatus() != SalesTransactionStatus.PENDING) {
                throw new IllegalStateException(
                        "Transaction " + transaction.getId() + " is already grouped into another consolidated invoice");
            }
        }

        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal taxTotal = BigDecimal.ZERO;
        for (SalesTransaction transaction : transactions) {
            BigDecimal lineTotal = transaction.getQuantity().multiply(transaction.getUnitPrice())
                    .setScale(2, RoundingMode.HALF_UP);
            subtotal = subtotal.add(lineTotal);
            taxTotal = taxTotal.add(transaction.getTaxAmount());

            linkRepository.save(new ConsolidatedInvoiceTransaction(invoice.getId(), transaction.getId()));
            transaction.setStatus(SalesTransactionStatus.GROUPED);
            salesTransactionRepository.save(transaction);
        }

        invoice.setSubtotal(subtotal);
        invoice.setTaxTotal(taxTotal);
        invoice.setGrandTotal(subtotal.add(taxTotal));
        consolidatedInvoiceRepository.save(invoice);
    }

    private void requireDraft(ConsolidatedInvoice invoice, String action) {
        if (invoice.getStatus() != ConsolidatedInvoiceStatus.DRAFT) {
            throw new IllegalStateException(
                    "Only DRAFT consolidated invoices can be " + action + " (current status: " + invoice.getStatus() + ")");
        }
    }

    private ConsolidatedInvoiceResponse toResponse(ConsolidatedInvoice invoice) {
        List<SalesTransactionResponse> transactions = linkRepository.findByConsolidatedInvoiceId(invoice.getId()).stream()
                .map(ConsolidatedInvoiceTransaction::getSalesTransactionId)
                .map(salesTransactionRepository::findById)
                .flatMap(java.util.Optional::stream)
                .map(this::toTransactionResponse)
                .toList();

        return new ConsolidatedInvoiceResponse(invoice.getId(), invoice.getPeriodStart(), invoice.getPeriodEnd(),
                invoice.getInvoiceTypeCode(), invoice.getCurrencyCode(), invoice.getSubtotal(), invoice.getTaxTotal(),
                invoice.getGrandTotal(), invoice.getStatus(), transactions, invoice.getCreatedAt(),
                invoice.getInvoiceName());
    }

    private SalesTransactionResponse toTransactionResponse(SalesTransaction t) {
        return new SalesTransactionResponse(t.getId(), t.getDocumentId(), t.getTransactionDate(), t.getDescription(),
                t.getQuantity(), t.getUnitPrice(), t.getTaxAmount(), t.getClassificationCode(), t.getUnitCode(),
                t.getBuyerName(), t.getBuyerTin(), t.isEligibleForConsolidation(), t.getStatus(), t.getConfidenceScore());
    }
}
