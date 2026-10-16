package com.mytax.mapper.referral;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "referral_codes")
public class ReferralCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String code;

    @Column(name = "salesperson_id", nullable = false)
    private Long salespersonId;

    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    protected ReferralCode() {
    }

    public ReferralCode(String code, Long salespersonId) {
        this.code = code;
        this.salespersonId = salespersonId;
    }

    public Long getId() { return id; }
    public String getCode() { return code; }
    public Long getSalespersonId() { return salespersonId; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public Instant getCreatedAt() { return createdAt; }
}
