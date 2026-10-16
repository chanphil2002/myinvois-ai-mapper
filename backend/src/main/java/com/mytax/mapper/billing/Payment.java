package com.mytax.mapper.billing;

import jakarta.persistence.*;

import java.time.Instant;

/** One successful charge (first payment or a renewal) — the user's payment history. */
@Entity
@Table(name = "payments")
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "subscription_id")
    private Long subscriptionId;

    @Column(nullable = false)
    private String provider;

    @Column(name = "provider_ref", nullable = false, unique = true)
    private String providerRef;

    @Column(name = "amount_cents", nullable = false)
    private int amountCents;

    private String description;

    @Column(name = "receipt_url")
    private String receiptUrl;

    @Column(name = "paid_at", nullable = false)
    private Instant paidAt;

    protected Payment() {
    }

    public Payment(Long userId, Long subscriptionId, String provider, String providerRef, int amountCents,
                   String description, String receiptUrl, Instant paidAt) {
        this.userId = userId;
        this.subscriptionId = subscriptionId;
        this.provider = provider;
        this.providerRef = providerRef;
        this.amountCents = amountCents;
        this.description = description;
        this.receiptUrl = receiptUrl;
        this.paidAt = paidAt;
    }

    public Long getId() { return id; }
    public Long getUserId() { return userId; }
    public Long getSubscriptionId() { return subscriptionId; }
    public String getProvider() { return provider; }
    public String getProviderRef() { return providerRef; }
    public int getAmountCents() { return amountCents; }
    public String getDescription() { return description; }
    public String getReceiptUrl() { return receiptUrl; }
    public Instant getPaidAt() { return paidAt; }
}
