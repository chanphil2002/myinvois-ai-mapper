package com.mytax.mapper.mapping;

import jakarta.persistence.*;

import java.math.BigDecimal;

@Entity
@Table(name = "mapped_invoice_line_items")
public class MappedInvoiceLineItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mapped_invoice_id", nullable = false)
    private Long mappedInvoiceId;

    @Column(name = "line_no", nullable = false)
    private Integer lineNo;

    private String description;

    private BigDecimal quantity = BigDecimal.ONE;

    @Column(name = "unit_price")
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Column(name = "tax_amount")
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "classification_code")
    private String classificationCode;

    @Column(name = "confidence_score")
    private BigDecimal confidenceScore;

    public MappedInvoiceLineItem() {
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

    public Long getMappedInvoiceId() {
        return mappedInvoiceId;
    }

    public void setMappedInvoiceId(Long mappedInvoiceId) {
        this.mappedInvoiceId = mappedInvoiceId;
    }

    public Integer getLineNo() {
        return lineNo;
    }

    public void setLineNo(Integer lineNo) {
        this.lineNo = lineNo;
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

    public BigDecimal getConfidenceScore() {
        return confidenceScore;
    }

    public void setConfidenceScore(BigDecimal confidenceScore) {
        this.confidenceScore = confidenceScore;
    }

    public static final class Builder {
        private final MappedInvoiceLineItem lineItem = new MappedInvoiceLineItem();

        public Builder mappedInvoiceId(Long mappedInvoiceId) {
            lineItem.mappedInvoiceId = mappedInvoiceId;
            return this;
        }

        public Builder lineNo(Integer lineNo) {
            lineItem.lineNo = lineNo;
            return this;
        }

        public Builder description(String description) {
            lineItem.description = description;
            return this;
        }

        public Builder quantity(BigDecimal quantity) {
            lineItem.quantity = quantity;
            return this;
        }

        public Builder unitPrice(BigDecimal unitPrice) {
            lineItem.unitPrice = unitPrice;
            return this;
        }

        public Builder taxAmount(BigDecimal taxAmount) {
            lineItem.taxAmount = taxAmount;
            return this;
        }

        public Builder classificationCode(String classificationCode) {
            lineItem.classificationCode = classificationCode;
            return this;
        }

        public Builder confidenceScore(BigDecimal confidenceScore) {
            lineItem.confidenceScore = confidenceScore;
            return this;
        }

        public MappedInvoiceLineItem build() {
            return lineItem;
        }
    }
}
