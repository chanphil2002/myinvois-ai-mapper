package com.mytax.mapper.billing;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "subscriptions")
public class Subscription {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String plan;

    @Enumerated(EnumType.STRING)
    private SubscriptionStatus status = SubscriptionStatus.PENDING;

    @Column(name = "billplz_bill_id")
    private String billplzBillId;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "paid_at")
    private Instant paidAt;

    public static Builder builder() {
        return new Builder();
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getPlan() {
        return plan;
    }

    public SubscriptionStatus getStatus() {
        return status;
    }

    public void setStatus(SubscriptionStatus status) {
        this.status = status;
    }

    public String getBillplzBillId() {
        return billplzBillId;
    }

    public int getAmountCents() {
        return amountCents;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getPaidAt() {
        return paidAt;
    }

    public void setPaidAt(Instant paidAt) {
        this.paidAt = paidAt;
    }

    public static final class Builder {
        private final Subscription s = new Subscription();

        public Builder userId(Long userId) {
            s.userId = userId;
            return this;
        }

        public Builder plan(String plan) {
            s.plan = plan;
            return this;
        }

        public Builder status(SubscriptionStatus status) {
            s.status = status;
            return this;
        }

        public Builder billplzBillId(String billplzBillId) {
            s.billplzBillId = billplzBillId;
            return this;
        }

        public Builder amountCents(int amountCents) {
            s.amountCents = amountCents;
            return this;
        }

        public Subscription build() {
            return s;
        }
    }
}
