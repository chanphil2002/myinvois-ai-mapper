package com.mytax.mapper.consolidation;

import com.mytax.mapper.common.EntityNotFoundException;
import com.mytax.mapper.consolidation.dto.ConsolidationBatchResponse;
import com.mytax.mapper.document.Document;
import com.mytax.mapper.document.DocumentRepository;
import com.mytax.mapper.document.DocumentService;
import com.mytax.mapper.mapping.InvoiceStatus;
import com.mytax.mapper.mapping.MappedInvoice;
import com.mytax.mapper.mapping.MappedInvoiceLineItem;
import com.mytax.mapper.mapping.MappedInvoiceLineItemRepository;
import com.mytax.mapper.mapping.MappedInvoiceMapper;
import com.mytax.mapper.mapping.MappedInvoiceRepository;
import com.mytax.mapper.mapping.dto.MappedInvoiceResponse;
import com.mytax.mapper.profile.BusinessProfile;
import com.mytax.mapper.profile.BusinessProfileService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Rolls up several already-mapped invoices (typically low-ticket receipts an AI mapping pass has
 * already extracted, one per document) into a single aggregate {@link MappedInvoice} addressed to
 * "General Public" — LHDN's Consolidated e-Invoice mechanism for high-volume, low-value B2C
 * sellers who would otherwise have to submit one e-Invoice per sale.
 *
 * <p>The generated invoice is a completely ordinary {@link MappedInvoice} afterwards: it flows
 * through the existing review (InvoiceReviewService), confirm, and submit (SubmissionService)
 * endpoints unchanged. This service only owns the batch lifecycle and the aggregation math.
 */
@Service
public class ConsolidationService {

    private final ConsolidationBatchRepository batchRepository;
    private final MappedInvoiceRepository mappedInvoiceRepository;
    private final MappedInvoiceLineItemRepository lineItemRepository;
    private final DocumentRepository documentRepository;
    private final DocumentService documentService;
    private final BusinessProfileService businessProfileService;

    public ConsolidationService(ConsolidationBatchRepository batchRepository,
                                 MappedInvoiceRepository mappedInvoiceRepository,
                                 MappedInvoiceLineItemRepository lineItemRepository,
                                 DocumentRepository documentRepository,
                                 DocumentService documentService,
                                 BusinessProfileService businessProfileService) {
        this.batchRepository = batchRepository;
        this.mappedInvoiceRepository = mappedInvoiceRepository;
        this.lineItemRepository = lineItemRepository;
        this.documentRepository = documentRepository;
        this.documentService = documentService;
        this.businessProfileService = businessProfileService;
    }

    @Transactional
    public ConsolidationBatchResponse getOrCreateBatch(Long userId, Integer periodYear, Integer periodMonth) {
        validatePeriod(periodYear, periodMonth);
        ConsolidationBatch batch = batchRepository
                .findByUserIdAndPeriodYearAndPeriodMonth(userId, periodYear, periodMonth)
                .orElseGet(() -> batchRepository.save(ConsolidationBatch.builder()
                        .userId(userId)
                        .periodYear(periodYear)
                        .periodMonth(periodMonth)
                        .status(ConsolidationBatchStatus.OPEN)
                        .build()));
        return toResponse(batch);
    }

    public List<ConsolidationBatchResponse> listBatches(Long userId) {
        return batchRepository.findByUserIdOrderByPeriodYearDescPeriodMonthDesc(userId).stream()
                .map(this::toResponse)
                .toList();
    }

    public ConsolidationBatchResponse getOwnedResponse(Long batchId, Long userId) {
        return toResponse(getOwned(batchId, userId));
    }

    public ConsolidationBatch getOwned(Long batchId, Long userId) {
        ConsolidationBatch batch = batchRepository.findById(batchId)
                .orElseThrow(() -> new EntityNotFoundException("Consolidation batch not found: " + batchId));
        if (!batch.getUserId().equals(userId)) {
            throw new EntityNotFoundException("Consolidation batch not found: " + batchId);
        }
        return batch;
    }

    /**
     * Candidates are the user's own not-yet-consolidated invoices in DRAFT or CONFIRMED status,
     * whose issue date (when the AI could extract one) falls inside the batch's period — plus any
     * with no recognized issue date at all, so the user can still route odd receipts in manually.
     */
    public List<MappedInvoiceResponse> listEligibleInvoices(Long batchId, Long userId) {
        ConsolidationBatch batch = getOwned(batchId, userId);
        LocalDate periodStart = LocalDate.of(batch.getPeriodYear(), batch.getPeriodMonth(), 1);
        LocalDate periodEnd = periodStart.withDayOfMonth(periodStart.lengthOfMonth());

        List<Long> documentIds = documentRepository.findByUserIdOrderByUploadedAtDesc(userId).stream()
                .map(Document::getId)
                .toList();
        if (documentIds.isEmpty()) {
            return List.of();
        }

        return mappedInvoiceRepository.findByDocumentIdIn(documentIds).stream()
                .filter(invoice -> invoice.getStatus() == InvoiceStatus.DRAFT || invoice.getStatus() == InvoiceStatus.CONFIRMED)
                .filter(invoice -> invoice.getIssueDate() == null
                        || (!invoice.getIssueDate().isBefore(periodStart) && !invoice.getIssueDate().isAfter(periodEnd)))
                .sorted(Comparator.comparing(MappedInvoice::getId))
                .map(invoice -> MappedInvoiceMapper.toResponse(invoice,
                        lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId())))
                .toList();
    }

    @Transactional
    public ConsolidationBatchResponse addInvoice(Long batchId, Long userId, Long mappedInvoiceId) {
        ConsolidationBatch batch = getOwned(batchId, userId);
        requireOpen(batch);

        MappedInvoice invoice = mappedInvoiceRepository.findById(mappedInvoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Mapped invoice not found: " + mappedInvoiceId));
        if (invoice.getDocumentId() == null) {
            throw new IllegalArgumentException("Only individually-mapped invoices can be added to a consolidation batch");
        }
        documentService.getOwned(invoice.getDocumentId(), userId);
        if (invoice.getStatus() != InvoiceStatus.DRAFT && invoice.getStatus() != InvoiceStatus.CONFIRMED) {
            throw new IllegalStateException(
                    "Only DRAFT or CONFIRMED invoices can be added to a consolidation batch (current status: " + invoice.getStatus() + ")");
        }
        if (invoice.getConsolidationBatchId() != null) {
            throw new IllegalStateException("Invoice is already part of a consolidation batch");
        }

        invoice.setConsolidationBatchId(batch.getId());
        invoice.setStatus(InvoiceStatus.CONSOLIDATED);
        mappedInvoiceRepository.save(invoice);

        return toResponse(batch);
    }

    @Transactional
    public ConsolidationBatchResponse removeInvoice(Long batchId, Long userId, Long mappedInvoiceId) {
        ConsolidationBatch batch = getOwned(batchId, userId);
        requireOpen(batch);

        MappedInvoice invoice = mappedInvoiceRepository.findById(mappedInvoiceId)
                .orElseThrow(() -> new EntityNotFoundException("Mapped invoice not found: " + mappedInvoiceId));
        if (invoice.isConsolidationResult() || !batch.getId().equals(invoice.getConsolidationBatchId())) {
            throw new EntityNotFoundException("Invoice is not part of this consolidation batch: " + mappedInvoiceId);
        }

        invoice.setConsolidationBatchId(null);
        invoice.setStatus(InvoiceStatus.DRAFT);
        mappedInvoiceRepository.save(invoice);

        return toResponse(batch);
    }

    /**
     * Aggregates every source invoice's line items into one line per classification code (so the
     * consolidated e-Invoice still carries a defensible tax-category breakdown instead of one
     * opaque total), and generates the resulting MappedInvoice addressed to "General Public".
     */
    @Transactional
    public ConsolidationBatchResponse generate(Long batchId, Long userId) {
        ConsolidationBatch batch = getOwned(batchId, userId);
        requireOpen(batch);

        List<MappedInvoice> sources = mappedInvoiceRepository
                .findByConsolidationBatchIdAndConsolidationResultFalse(batch.getId());
        if (sources.isEmpty()) {
            throw new IllegalStateException("Add at least one invoice before generating the consolidated e-Invoice");
        }

        String currency = resolveCommonCurrency(sources);
        BusinessProfile supplier = businessProfileService.getOwned(userId);

        MappedInvoice result = MappedInvoice.builder()
                .documentId(null)
                .consolidationBatchId(batch.getId())
                .invoiceTypeCode("01")
                .issueDate(LocalDate.now())
                .currencyCode(currency)
                .supplierTin(supplier.getTin())
                .supplierName(supplier.getRegistrationName())
                // Per LHDN's e-Invoice Guideline for Consolidated e-Invoice: the buyer is recorded
                // as "General Public" with this generic TIN/registration number rather than a real
                // buyer identity. Verify these values against the current MyInvois SDK guideline
                // before a real submission — LHDN has revised generic values like this before, and
                // this scaffold hasn't been validated against a live LHDN sandbox response the way
                // UblDocumentBuilder's per-invoice shape was.
                .buyerName("General Public")
                .buyerTin("EI00000000010")
                .buyerIdType("BRN")
                .buyerIdValue("NA")
                .status(InvoiceStatus.DRAFT)
                .build();
        result.setConsolidationResult(true);
        result = mappedInvoiceRepository.save(result);

        Aggregation aggregation = aggregateLineItems(sources);
        int lineNo = 1;
        for (Map.Entry<String, GroupTotal> entry : aggregation.groups().entrySet()) {
            String classificationCode = entry.getKey().isBlank() ? null : entry.getKey();
            GroupTotal total = entry.getValue();

            MappedInvoiceLineItem line = MappedInvoiceLineItem.builder()
                    .mappedInvoiceId(result.getId())
                    .lineNo(lineNo++)
                    .description(describeGroup(classificationCode, total.count()))
                    .quantity(BigDecimal.ONE)
                    .unitPrice(total.subtotal())
                    .taxAmount(total.tax())
                    .classificationCode(classificationCode)
                    .unitCode("C62")
                    .build();
            lineItemRepository.save(line);
        }

        result.setSubtotal(aggregation.subtotal());
        result.setTaxTotal(aggregation.tax());
        result.setGrandTotal(aggregation.subtotal().add(aggregation.tax()));
        mappedInvoiceRepository.save(result);

        batch.setStatus(ConsolidationBatchStatus.GENERATED);
        batch.setGeneratedAt(Instant.now());
        batch = batchRepository.save(batch);

        return toResponse(batch);
    }

    private record GroupTotal(BigDecimal subtotal, BigDecimal tax, int count) {
        GroupTotal plus(BigDecimal lineSubtotal, BigDecimal lineTax) {
            return new GroupTotal(subtotal.add(lineSubtotal), tax.add(lineTax), count + 1);
        }
    }

    private record Aggregation(Map<String, GroupTotal> groups, BigDecimal subtotal, BigDecimal tax) {
    }

    private Aggregation aggregateLineItems(List<MappedInvoice> sources) {
        Map<String, GroupTotal> groups = new LinkedHashMap<>();
        for (MappedInvoice source : sources) {
            List<MappedInvoiceLineItem> items = lineItemRepository.findByMappedInvoiceIdOrderByLineNo(source.getId());
            if (items.isEmpty()) {
                // No line items survived mapping for this receipt — fall back to its own totals
                // under an "uncategorized" group rather than silently dropping the sale.
                groups.merge("", new GroupTotal(nz(source.getSubtotal()), nz(source.getTaxTotal()), 1),
                        (existing, addition) -> existing.plus(addition.subtotal(), addition.tax()));
                continue;
            }
            for (MappedInvoiceLineItem item : items) {
                String key = item.getClassificationCode() != null ? item.getClassificationCode() : "";
                BigDecimal lineSubtotal = nz(item.getQuantity()).multiply(nz(item.getUnitPrice()));
                BigDecimal lineTax = nz(item.getTaxAmount());
                groups.merge(key, new GroupTotal(lineSubtotal, lineTax, 1),
                        (existing, addition) -> existing.plus(addition.subtotal(), addition.tax()));
            }
        }

        // Round once per group at the end rather than per line, so rounding error doesn't compound.
        Map<String, GroupTotal> rounded = new LinkedHashMap<>();
        BigDecimal subtotal = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        for (Map.Entry<String, GroupTotal> entry : groups.entrySet()) {
            GroupTotal g = entry.getValue();
            BigDecimal groupSubtotal = g.subtotal().setScale(2, RoundingMode.HALF_UP);
            BigDecimal groupTax = g.tax().setScale(2, RoundingMode.HALF_UP);
            rounded.put(entry.getKey(), new GroupTotal(groupSubtotal, groupTax, g.count()));
            subtotal = subtotal.add(groupSubtotal);
            tax = tax.add(groupTax);
        }
        return new Aggregation(rounded, subtotal, tax);
    }

    private String describeGroup(String classificationCode, int count) {
        String suffix = classificationCode != null ? " — " + classificationCode : "";
        return "Consolidated sales" + suffix + " (" + count + " item" + (count == 1 ? "" : "s") + ")";
    }

    private String resolveCommonCurrency(List<MappedInvoice> sources) {
        String currency = normalizeCurrency(sources.get(0).getCurrencyCode());
        for (MappedInvoice source : sources) {
            if (!normalizeCurrency(source.getCurrencyCode()).equals(currency)) {
                throw new IllegalStateException("All invoices in a consolidation batch must share the same currency");
            }
        }
        return currency;
    }

    private String normalizeCurrency(String currencyCode) {
        return currencyCode != null ? currencyCode : "MYR";
    }

    private void requireOpen(ConsolidationBatch batch) {
        if (batch.getStatus() != ConsolidationBatchStatus.OPEN) {
            throw new IllegalStateException("Consolidation batch is not open (current status: " + batch.getStatus() + ")");
        }
    }

    private void validatePeriod(Integer year, Integer month) {
        if (month == null || month < 1 || month > 12) {
            throw new IllegalArgumentException("periodMonth must be between 1 and 12");
        }
        if (year == null || year < 2000 || year > 2100) {
            throw new IllegalArgumentException("periodYear looks invalid: " + year);
        }
    }

    private BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private ConsolidationBatchResponse toResponse(ConsolidationBatch batch) {
        List<MappedInvoice> sourceInvoices = mappedInvoiceRepository
                .findByConsolidationBatchIdAndConsolidationResultFalse(batch.getId());
        List<MappedInvoiceResponse> items = sourceInvoices.stream()
                .map(invoice -> MappedInvoiceMapper.toResponse(invoice,
                        lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId())))
                .toList();

        MappedInvoiceResponse resultInvoice = mappedInvoiceRepository
                .findByConsolidationBatchIdAndConsolidationResultTrue(batch.getId())
                .map(invoice -> MappedInvoiceMapper.toResponse(invoice,
                        lineItemRepository.findByMappedInvoiceIdOrderByLineNo(invoice.getId())))
                .orElse(null);

        BigDecimal itemsTotal = items.stream()
                .map(item -> item.grandTotal() != null ? item.grandTotal() : BigDecimal.ZERO)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        return new ConsolidationBatchResponse(batch.getId(), batch.getPeriodYear(), batch.getPeriodMonth(),
                batch.getStatus(), batch.getCreatedAt(), batch.getGeneratedAt(), items, itemsTotal, resultInvoice);
    }
}
