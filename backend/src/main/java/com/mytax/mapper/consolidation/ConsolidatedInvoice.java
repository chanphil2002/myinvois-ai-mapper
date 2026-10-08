package com.mytax.mapper.consolidation;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "consolidated_invoices")
public class ConsolidatedInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    @Column(name = "invoice_type_code", nullable = false)
    private String invoiceTypeCode = "01";

    @Column(name = "currency_code", nullable = false)
    private String currencyCode = "MYR";

    private BigDecimal subtotal = BigDecimal.ZERO;

    @Column(name = "tax_total")
    private BigDecimal taxTotal = BigDecimal.ZERO;

    @Column(name = "grand_total")
    private BigDecimal grandTotal = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    private ConsolidatedInvoiceStatus status = ConsolidatedInvoiceStatus.DRAFT;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    public ConsolidatedInvoice() {
    }

    public static Builder builder() {
        return new Builder();
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public LocalDate getPeriodStart() {
        return periodStart;
    }

    public void setPeriodStart(LocalDate periodStart) {
        this.periodStart = periodStart;
    }

    public LocalDate getPeriodEnd() {
        return periodEnd;
    }

    public void setPeriodEnd(LocalDate periodEnd) {
        this.periodEnd = periodEnd;
    }

    public String getInvoiceTypeCode() {
        return invoiceTypeCode;
    }

    public void setInvoiceTypeCode(String invoiceTypeCode) {
        this.invoiceTypeCode = invoiceTypeCode;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public BigDecimal getSubtotal() {
        return subtotal;
    }

    public void setSubtotal(BigDecimal subtotal) {
        this.subtotal = subtotal;
    }

    public BigDecimal getTaxTotal() {
        return taxTotal;
    }

    public void setTaxTotal(BigDecimal taxTotal) {
        this.taxTotal = taxTotal;
    }

    public BigDecimal getGrandTotal() {
        return grandTotal;
    }

    public void setGrandTotal(BigDecimal grandTotal) {
        this.grandTotal = grandTotal;
    }

    public ConsolidatedInvoiceStatus getStatus() {
        return status;
    }

    public void setStatus(ConsolidatedInvoiceStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static final class Builder {
        private final ConsolidatedInvoice invoice = new ConsolidatedInvoice();

        public Builder userId(Long userId) {
            invoice.userId = userId;
            return this;
        }

        public Builder periodStart(LocalDate periodStart) {
            invoice.periodStart = periodStart;
            return this;
        }

        public Builder periodEnd(LocalDate periodEnd) {
            invoice.periodEnd = periodEnd;
            return this;
        }

        public Builder invoiceTypeCode(String invoiceTypeCode) {
            invoice.invoiceTypeCode = invoiceTypeCode;
            return this;
        }

        public Builder currencyCode(String currencyCode) {
            invoice.currencyCode = currencyCode;
            return this;
        }

        public Builder subtotal(BigDecimal subtotal) {
            invoice.subtotal = subtotal;
            return this;
        }

        public Builder taxTotal(BigDecimal taxTotal) {
            invoice.taxTotal = taxTotal;
            return this;
        }

        public Builder grandTotal(BigDecimal grandTotal) {
            invoice.grandTotal = grandTotal;
            return this;
        }

        public Builder status(ConsolidatedInvoiceStatus status) {
            invoice.status = status;
            return this;
        }

        public ConsolidatedInvoice build() {
            return invoice;
        }
    }
}
