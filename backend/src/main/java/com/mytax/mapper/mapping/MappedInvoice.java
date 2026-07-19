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

    @Column(name = "buyer_id_type")
    private String buyerIdType;

    @Column(name = "buyer_id_value")
    private String buyerIdValue;

    @Column(name = "buyer_sst")
    private String buyerSst;

    @Column(name = "buyer_address_line1")
    private String buyerAddressLine1;

    @Column(name = "buyer_address_line2")
    private String buyerAddressLine2;

    @Column(name = "buyer_city")
    private String buyerCity;

    @Column(name = "buyer_postal_zone")
    private String buyerPostalZone;

    @Column(name = "buyer_state_code")
    private String buyerStateCode;

    @Column(name = "buyer_country_code")
    private String buyerCountryCode;

    @Column(name = "buyer_phone")
    private String buyerPhone;

    @Column(name = "buyer_email")
    private String buyerEmail;

    private BigDecimal subtotal;

    @Column(name = "tax_total")
    private BigDecimal taxTotal;

    @Column(name = "grand_total")
    private BigDecimal grandTotal;

    @Column(name = "discount_total")
    private BigDecimal discountTotal;

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

    public String getBuyerIdType() {
        return buyerIdType;
    }

    public void setBuyerIdType(String buyerIdType) {
        this.buyerIdType = buyerIdType;
    }

    public String getBuyerIdValue() {
        return buyerIdValue;
    }

    public void setBuyerIdValue(String buyerIdValue) {
        this.buyerIdValue = buyerIdValue;
    }

    public String getBuyerSst() {
        return buyerSst;
    }

    public void setBuyerSst(String buyerSst) {
        this.buyerSst = buyerSst;
    }

    public String getBuyerAddressLine1() {
        return buyerAddressLine1;
    }

    public void setBuyerAddressLine1(String buyerAddressLine1) {
        this.buyerAddressLine1 = buyerAddressLine1;
    }

    public String getBuyerAddressLine2() {
        return buyerAddressLine2;
    }

    public void setBuyerAddressLine2(String buyerAddressLine2) {
        this.buyerAddressLine2 = buyerAddressLine2;
    }

    public String getBuyerCity() {
        return buyerCity;
    }

    public void setBuyerCity(String buyerCity) {
        this.buyerCity = buyerCity;
    }

    public String getBuyerPostalZone() {
        return buyerPostalZone;
    }

    public void setBuyerPostalZone(String buyerPostalZone) {
        this.buyerPostalZone = buyerPostalZone;
    }

    public String getBuyerStateCode() {
        return buyerStateCode;
    }

    public void setBuyerStateCode(String buyerStateCode) {
        this.buyerStateCode = buyerStateCode;
    }

    public String getBuyerCountryCode() {
        return buyerCountryCode;
    }

    public void setBuyerCountryCode(String buyerCountryCode) {
        this.buyerCountryCode = buyerCountryCode;
    }

    public String getBuyerPhone() {
        return buyerPhone;
    }

    public void setBuyerPhone(String buyerPhone) {
        this.buyerPhone = buyerPhone;
    }

    public String getBuyerEmail() {
        return buyerEmail;
    }

    public void setBuyerEmail(String buyerEmail) {
        this.buyerEmail = buyerEmail;
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

    public BigDecimal getDiscountTotal() {
        return discountTotal;
    }

    public void setDiscountTotal(BigDecimal discountTotal) {
        this.discountTotal = discountTotal;
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

        public Builder buyerIdType(String buyerIdType) {
            invoice.buyerIdType = buyerIdType;
            return this;
        }

        public Builder buyerIdValue(String buyerIdValue) {
            invoice.buyerIdValue = buyerIdValue;
            return this;
        }

        public Builder buyerSst(String buyerSst) {
            invoice.buyerSst = buyerSst;
            return this;
        }

        public Builder buyerAddressLine1(String buyerAddressLine1) {
            invoice.buyerAddressLine1 = buyerAddressLine1;
            return this;
        }

        public Builder buyerAddressLine2(String buyerAddressLine2) {
            invoice.buyerAddressLine2 = buyerAddressLine2;
            return this;
        }

        public Builder buyerCity(String buyerCity) {
            invoice.buyerCity = buyerCity;
            return this;
        }

        public Builder buyerPostalZone(String buyerPostalZone) {
            invoice.buyerPostalZone = buyerPostalZone;
            return this;
        }

        public Builder buyerStateCode(String buyerStateCode) {
            invoice.buyerStateCode = buyerStateCode;
            return this;
        }

        public Builder buyerCountryCode(String buyerCountryCode) {
            invoice.buyerCountryCode = buyerCountryCode;
            return this;
        }

        public Builder buyerPhone(String buyerPhone) {
            invoice.buyerPhone = buyerPhone;
            return this;
        }

        public Builder buyerEmail(String buyerEmail) {
            invoice.buyerEmail = buyerEmail;
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

        public Builder discountTotal(BigDecimal discountTotal) {
            invoice.discountTotal = discountTotal;
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
