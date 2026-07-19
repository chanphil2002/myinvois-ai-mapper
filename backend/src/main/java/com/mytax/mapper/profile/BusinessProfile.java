package com.mytax.mapper.profile;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "business_profiles")
public class BusinessProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "registration_name", nullable = false)
    private String registrationName;

    @Column(nullable = false)
    private String tin;

    @Column(name = "id_type", nullable = false)
    private String idType = "NRIC";

    @Column(name = "id_value", nullable = false)
    private String idValue;

    @Column(name = "sst_registration")
    private String sstRegistration;

    @Column(name = "ttx_registration")
    private String ttxRegistration;

    @Column(name = "msic_code")
    private String msicCode;

    @Column(name = "msic_description")
    private String msicDescription;

    @Column(name = "address_line1")
    private String addressLine1;

    @Column(name = "address_line2")
    private String addressLine2;

    private String city;

    @Column(name = "postal_zone")
    private String postalZone;

    @Column(name = "state_code")
    private String stateCode;

    @Column(name = "country_code", nullable = false)
    private String countryCode = "MYS";

    private String phone;

    private String email;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    @Column(name = "updated_at", insertable = false)
    private Instant updatedAt;

    public BusinessProfile() {
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

    public String getRegistrationName() {
        return registrationName;
    }

    public void setRegistrationName(String registrationName) {
        this.registrationName = registrationName;
    }

    public String getTin() {
        return tin;
    }

    public void setTin(String tin) {
        this.tin = tin;
    }

    public String getIdType() {
        return idType;
    }

    public void setIdType(String idType) {
        this.idType = idType;
    }

    public String getIdValue() {
        return idValue;
    }

    public void setIdValue(String idValue) {
        this.idValue = idValue;
    }

    public String getSstRegistration() {
        return sstRegistration;
    }

    public void setSstRegistration(String sstRegistration) {
        this.sstRegistration = sstRegistration;
    }

    public String getTtxRegistration() {
        return ttxRegistration;
    }

    public void setTtxRegistration(String ttxRegistration) {
        this.ttxRegistration = ttxRegistration;
    }

    public String getMsicCode() {
        return msicCode;
    }

    public void setMsicCode(String msicCode) {
        this.msicCode = msicCode;
    }

    public String getMsicDescription() {
        return msicDescription;
    }

    public void setMsicDescription(String msicDescription) {
        this.msicDescription = msicDescription;
    }

    public String getAddressLine1() {
        return addressLine1;
    }

    public void setAddressLine1(String addressLine1) {
        this.addressLine1 = addressLine1;
    }

    public String getAddressLine2() {
        return addressLine2;
    }

    public void setAddressLine2(String addressLine2) {
        this.addressLine2 = addressLine2;
    }

    public String getCity() {
        return city;
    }

    public void setCity(String city) {
        this.city = city;
    }

    public String getPostalZone() {
        return postalZone;
    }

    public void setPostalZone(String postalZone) {
        this.postalZone = postalZone;
    }

    public String getStateCode() {
        return stateCode;
    }

    public void setStateCode(String stateCode) {
        this.stateCode = stateCode;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public void setCountryCode(String countryCode) {
        this.countryCode = countryCode;
    }

    public String getPhone() {
        return phone;
    }

    public void setPhone(String phone) {
        this.phone = phone;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public Instant getUpdatedAt() {
        return updatedAt;
    }

    public static final class Builder {
        private final BusinessProfile profile = new BusinessProfile();

        public Builder userId(Long userId) {
            profile.userId = userId;
            return this;
        }

        public Builder registrationName(String registrationName) {
            profile.registrationName = registrationName;
            return this;
        }

        public Builder tin(String tin) {
            profile.tin = tin;
            return this;
        }

        public Builder idType(String idType) {
            profile.idType = idType;
            return this;
        }

        public Builder idValue(String idValue) {
            profile.idValue = idValue;
            return this;
        }

        public Builder sstRegistration(String sstRegistration) {
            profile.sstRegistration = sstRegistration;
            return this;
        }

        public Builder ttxRegistration(String ttxRegistration) {
            profile.ttxRegistration = ttxRegistration;
            return this;
        }

        public Builder msicCode(String msicCode) {
            profile.msicCode = msicCode;
            return this;
        }

        public Builder msicDescription(String msicDescription) {
            profile.msicDescription = msicDescription;
            return this;
        }

        public Builder addressLine1(String addressLine1) {
            profile.addressLine1 = addressLine1;
            return this;
        }

        public Builder addressLine2(String addressLine2) {
            profile.addressLine2 = addressLine2;
            return this;
        }

        public Builder city(String city) {
            profile.city = city;
            return this;
        }

        public Builder postalZone(String postalZone) {
            profile.postalZone = postalZone;
            return this;
        }

        public Builder stateCode(String stateCode) {
            profile.stateCode = stateCode;
            return this;
        }

        public Builder countryCode(String countryCode) {
            profile.countryCode = countryCode;
            return this;
        }

        public Builder phone(String phone) {
            profile.phone = phone;
            return this;
        }

        public Builder email(String email) {
            profile.email = email;
            return this;
        }

        public BusinessProfile build() {
            return profile;
        }
    }
}
