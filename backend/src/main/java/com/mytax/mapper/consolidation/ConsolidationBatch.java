package com.mytax.mapper.consolidation;

import jakarta.persistence.*;

import java.time.Instant;

/**
 * A month's worth of already-mapped invoices a user is rolling up into one LHDN consolidated
 * e-Invoice, per LHDN's Consolidated e-Invoice mechanism for high-volume, low-value B2C sales
 * (e.g. retail, F&amp;B, repair shops) — submit once a month instead of once per sale.
 */
@Entity
@Table(name = "consolidation_batches")
public class ConsolidationBatch {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "period_year", nullable = false)
    private Integer periodYear;

    @Column(name = "period_month", nullable = false)
    private Integer periodMonth;

    @Enumerated(EnumType.STRING)
    private ConsolidationBatchStatus status = ConsolidationBatchStatus.OPEN;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "generated_at")
    private Instant generatedAt;

    public ConsolidationBatch() {
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

    public Integer getPeriodYear() {
        return periodYear;
    }

    public void setPeriodYear(Integer periodYear) {
        this.periodYear = periodYear;
    }

    public Integer getPeriodMonth() {
        return periodMonth;
    }

    public void setPeriodMonth(Integer periodMonth) {
        this.periodMonth = periodMonth;
    }

    public ConsolidationBatchStatus getStatus() {
        return status;
    }

    public void setStatus(ConsolidationBatchStatus status) {
        this.status = status;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getGeneratedAt() {
        return generatedAt;
    }

    public void setGeneratedAt(Instant generatedAt) {
        this.generatedAt = generatedAt;
    }

    public static final class Builder {
        private final ConsolidationBatch batch = new ConsolidationBatch();

        public Builder userId(Long userId) {
            batch.userId = userId;
            return this;
        }

        public Builder periodYear(Integer periodYear) {
            batch.periodYear = periodYear;
            return this;
        }

        public Builder periodMonth(Integer periodMonth) {
            batch.periodMonth = periodMonth;
            return this;
        }

        public Builder status(ConsolidationBatchStatus status) {
            batch.status = status;
            return this;
        }

        public ConsolidationBatch build() {
            return batch;
        }
    }
}
