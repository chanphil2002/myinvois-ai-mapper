package com.mytax.mapper.auth;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "users")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    private String tin;

    private String role = "OWNER";

    /** False when an admin has blocked the account — it can't log in or use existing sessions. */
    @Column(nullable = false)
    private boolean active = true;

    /** Referral code used at sign-up; its salesperson earns commission on this user's payments. */
    @Column(name = "referral_code_id")
    private Long referralCodeId;

    /** Which MyInvois environment submissions go to (credentials are stored per environment). */
    @Enumerated(EnumType.STRING)
    @Column(name = "myinvois_environment", nullable = false)
    private com.mytax.mapper.myinvois.MyInvoisEnvironment myinvoisEnvironment =
            com.mytax.mapper.myinvois.MyInvoisEnvironment.SANDBOX;

    @Column(name = "created_at", nullable = false, updatable = false, insertable = false)
    private Instant createdAt;

    public User() {
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

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getCompanyName() {
        return companyName;
    }

    public void setCompanyName(String companyName) {
        this.companyName = companyName;
    }

    public String getTin() {
        return tin;
    }

    public void setTin(String tin) {
        this.tin = tin;
    }

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public com.mytax.mapper.myinvois.MyInvoisEnvironment getMyinvoisEnvironment() {
        return myinvoisEnvironment;
    }

    public void setMyinvoisEnvironment(com.mytax.mapper.myinvois.MyInvoisEnvironment myinvoisEnvironment) {
        this.myinvoisEnvironment = myinvoisEnvironment;
    }

    public boolean isActive() {
        return active;
    }

    public void setActive(boolean active) {
        this.active = active;
    }

    public Long getReferralCodeId() {
        return referralCodeId;
    }

    public void setReferralCodeId(Long referralCodeId) {
        this.referralCodeId = referralCodeId;
    }

    public boolean isAdmin() {
        return "ADMIN".equals(role);
    }

    public static final class Builder {
        private final User user = new User();

        public Builder email(String email) {
            user.email = email;
            return this;
        }

        public Builder passwordHash(String passwordHash) {
            user.passwordHash = passwordHash;
            return this;
        }

        public Builder companyName(String companyName) {
            user.companyName = companyName;
            return this;
        }

        public Builder tin(String tin) {
            user.tin = tin;
            return this;
        }

        public Builder role(String role) {
            user.role = role;
            return this;
        }

        public User build() {
            return user;
        }
    }
}
