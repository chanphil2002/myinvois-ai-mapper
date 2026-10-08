package com.mytax.mapper.mapping;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "sales_transactions")
public class SalesTransaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Column(name = "extraction_job_id")
    private Long extractionJobId;

    @Column(name = "transaction_date")
    private LocalDate transactionDate;

    private String description;

    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "unit_price")
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "tax_amount")
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "classification_code")
    private String classificationCode;

    @Column(name = "unit_code")
    private String unitCode = "C62";

    @Column(name = "buyer_name")
    private String buyerName;

    @Column(name = "buyer_tin")
    private String buyerTin;

    @Column(name = "eligible_for_consolidation")
    private boolean eligibleForConsolidation = true;

    @Enumerated(EnumType.STRING)
    private SalesTransactionStatus status = SalesTransactionStatus.PENDING;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    public SalesTransaction() {
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

    public LocalDate getTransactionDate() {
        return transactionDate;
    }

    public void setTransactionDate(LocalDate transactionDate) {
        this.transactionDate = transactionDate;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public BigDecimal getQuantity() {
        return quantity;
    }

    public void setQuantity(BigDecimal quantity) {
        this.quantity = quantity;
    }

    public BigDecimal getUnitPrice() {
        return unitPrice;
    }

    public void setUnitPrice(BigDecimal unitPrice) {
        this.unitPrice = unitPrice;
    }

    public BigDecimal getTaxAmount() {
        return taxAmount;
    }

    public void setTaxAmount(BigDecimal taxAmount) {
        this.taxAmount = taxAmount;
    }

    public String getClassificationCode() {
        return classificationCode;
    }

    public void setClassificationCode(String classificationCode) {
        this.classificationCode = classificationCode;
    }

    public String getUnitCode() {
        return unitCode;
    }

    public void setUnitCode(String unitCode) {
        this.unitCode = unitCode;
    }

    public String getBuyerName() {
        return buyerName;
    }

    public void setBuyerName(String buyerName) {
        this.buyerName = buyerName;
    }

    public String getBuyerTin() {
        return buyerTin;
    }

    public void setBuyerTin(String buyerTin) {
        this.buyerTin = buyerTin;
    }

    public boolean isEligibleForConsolidation() {
        return eligibleForConsolidation;
    }

    public void setEligibleForConsolidation(boolean eligibleForConsolidation) {
        this.eligibleForConsolidation = eligibleForConsolidation;
    }

    public SalesTransactionStatus getStatus() {
        return status;
    }

    public void setStatus(SalesTransactionStatus status) {
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
        private final SalesTransaction transaction = new SalesTransaction();

        public Builder documentId(Long documentId) {
            transaction.documentId = documentId;
            return this;
        }

        public Builder extractionJobId(Long extractionJobId) {
            transaction.extractionJobId = extractionJobId;
            return this;
        }

        public Builder transactionDate(LocalDate transactionDate) {
            transaction.transactionDate = transactionDate;
            return this;
        }

        public Builder description(String description) {
            transaction.description = description;
            return this;
        }

        public Builder quantity(BigDecimal quantity) {
            transaction.quantity = quantity;
            return this;
        }

        public Builder unitPrice(BigDecimal unitPrice) {
            transaction.unitPrice = unitPrice;
            return this;
        }

        public Builder taxAmount(BigDecimal taxAmount) {
            transaction.taxAmount = taxAmount;
            return this;
        }

        public Builder classificationCode(String classificationCode) {
            transaction.classificationCode = classificationCode;
            return this;
        }

        public Builder unitCode(String unitCode) {
            transaction.unitCode = unitCode;
            return this;
        }

        public Builder buyerName(String buyerName) {
            transaction.buyerName = buyerName;
            return this;
        }

        public Builder buyerTin(String buyerTin) {
            transaction.buyerTin = buyerTin;
            return this;
        }

        public Builder eligibleForConsolidation(boolean eligibleForConsolidation) {
            transaction.eligibleForConsolidation = eligibleForConsolidation;
            return this;
        }

        public Builder status(SalesTransactionStatus status) {
            transaction.status = status;
            return this;
        }

        public Builder confidenceScore(BigDecimal confidenceScore) {
            transaction.confidenceScore = confidenceScore;
            return this;
        }

        public SalesTransaction build() {
            return transaction;
        }
    }
}
