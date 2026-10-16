package com.mytax.mapper.referral;

import jakarta.persistence.*;

import java.math.BigDecimal;
import java.time.Instant;

/** What a salesperson earned from one payment by a user they referred. */
@Entity
@Table(name = "commissions")
public class Commission {

    public enum Status { PENDING, PAID }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "salesperson_id", nullable = false)
    private Long salespersonId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "subscription_id")
    private Long subscriptionId;

    @Column(name = "payment_ref", nullable = false, unique = true)
    private String paymentRef;

    @Column(name = "payment_amount_cents", nullable = false)
    private int paymentAmountCents;

    @Column(nullable = false)
    private BigDecimal percent;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Status status = Status.PENDING;

    @Column(name = "paid_at")
    private Instant paidAt;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    protected Commission() {
    }

    public Commission(Long salespersonId, Long userId, Long subscriptionId, String paymentRef,
                      int paymentAmountCents, BigDecimal percent, int amountCents) {
        this.salespersonId = salespersonId;
        this.userId = userId;
        this.subscriptionId = subscriptionId;
        this.paymentRef = paymentRef;
        this.paymentAmountCents = paymentAmountCents;
        this.percent = percent;
        this.amountCents = amountCents;
    }

    public Long getId() { return id; }
    public Long getSalespersonId() { return salespersonId; }
    public Long getUserId() { return userId; }
    public Long getSubscriptionId() { return subscriptionId; }
    public String getPaymentRef() { return paymentRef; }
    public int getPaymentAmountCents() { return paymentAmountCents; }
    public BigDecimal getPercent() { return percent; }
    public int getAmountCents() { return amountCents; }
    public Status getStatus() { return status; }
    public void setStatus(Status status) { this.status = status; }
    public Instant getPaidAt() { return paidAt; }
    public void setPaidAt(Instant paidAt) { this.paidAt = paidAt; }
    public Instant getCreatedAt() { return createdAt; }
}
