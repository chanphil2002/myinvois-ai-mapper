package com.mytax.mapper.mapping;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "mapped_invoices")
public class MappedInvoice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "extraction_job_id")
    private Long extractionJobId;

    @Column(name = "invoice_type_code", nullable = false)
    private String invoiceTypeCode = "01";

    @Column(name = "issue_date")
    private LocalDate issueDate;

    @Column(name = "currency_code", nullable = false)
    private String currencyCode = "MYR";

    @Column(name = "supplier_tin")
    private String supplierTin;

    @Column(name = "supplier_name")
    private String supplierName;

    @Column(name = "buyer_tin")
    private String buyerTin;

    @Column(name = "buyer_name")
    private String buyerName;

    private BigDecimal subtotal;

    @Column(name = "tax_total")
    private BigDecimal taxTotal;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Enumerated(EnumType.STRING)
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    public MappedInvoice() {
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

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public Long getExtractionJobId() {
        return extractionJobId;
    }

    public void setExtractionJobId(Long extractionJobId) {
        this.extractionJobId = extractionJobId;
    }

    public String getInvoiceTypeCode() {
        return invoiceTypeCode;
    }

    public void setInvoiceTypeCode(String invoiceTypeCode) {
        this.invoiceTypeCode = invoiceTypeCode;
    }

    public LocalDate getIssueDate() {
        return issueDate;
    }

    public void setIssueDate(LocalDate issueDate) {
        this.issueDate = issueDate;
    }

    public String getCurrencyCode() {
        return currencyCode;
    }

    public void setCurrencyCode(String currencyCode) {
        this.currencyCode = currencyCode;
    }

    public String getSupplierTin() {
        return supplierTin;
    }

    public void setSupplierTin(String supplierTin) {
        this.supplierTin = supplierTin;
    }

    public String getSupplierName() {
        return supplierName;
    }

    public void setSupplierName(String supplierName) {
        this.supplierName = supplierName;
    }

    public String getBuyerTin() {
        return buyerTin;
    }

    public void setBuyerTin(String buyerTin) {
        this.buyerTin = buyerTin;
    }

    public String getBuyerName() {
        return buyerName;
    }

    public void setBuyerName(String buyerName) {
        this.buyerName = buyerName;
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

    public InvoiceStatus getStatus() {
        return status;
    }

    public void setStatus(InvoiceStatus status) {
        this.status = status;
    }

    public BigDecimal getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(BigDecimal confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static final class Builder {
        private final MappedInvoice invoice = new MappedInvoice();

        public Builder documentId(Long documentId) {
            invoice.documentId = documentId;
            return this;
        }

        public Builder extractionJobId(Long extractionJobId) {
            invoice.extractionJobId = extractionJobId;
            return this;
        }

        public Builder invoiceTypeCode(String invoiceTypeCode) {
            invoice.invoiceTypeCode = invoiceTypeCode;
            return this;
        }

        public Builder issueDate(LocalDate issueDate) {
            invoice.issueDate = issueDate;
            return this;
        }

        public Builder currencyCode(String currencyCode) {
            invoice.currencyCode = currencyCode;
            return this;
        }

        public Builder supplierTin(String supplierTin) {
            invoice.supplierTin = supplierTin;
            return this;
        }

        public Builder supplierName(String supplierName) {
            invoice.supplierName = supplierName;
            return this;
        }

        public Builder buyerTin(String buyerTin) {
            invoice.buyerTin = buyerTin;
            return this;
        }

        public Builder buyerName(String buyerName) {
            invoice.buyerName = buyerName;
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

        public Builder status(InvoiceStatus status) {
            invoice.status = status;
            return this;
        }

        public Builder confidenceScore(BigDecimal confidenceScore) {
            invoice.confidenceScore = confidenceScore;
            return this;
        }

        public MappedInvoice build() {
            return invoice;
        }
    }
}
