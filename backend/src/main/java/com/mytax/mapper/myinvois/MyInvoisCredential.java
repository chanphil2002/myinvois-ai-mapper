package com.mytax.mapper.myinvois;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "myinvois_credentials")
public class MyInvoisCredential {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "client_id", nullable = false)
    private String clientId;

    /** AES-GCM encrypted at the application layer before persistence — see {@code CredentialCryptoService}. */
    @Column(name = "client_secret_encrypted", nullable = false, columnDefinition = "TEXT")
    private String clientSecretEncrypted;

    @Enumerated(EnumType.STRING)
    private MyInvoisEnvironment environment = MyInvoisEnvironment.SANDBOX;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    public MyInvoisCredential() {
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

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getClientSecretEncrypted() {
        return clientSecretEncrypted;
    }

    public void setClientSecretEncrypted(String clientSecretEncrypted) {
        this.clientSecretEncrypted = clientSecretEncrypted;
    }

    public MyInvoisEnvironment getEnvironment() {
        return environment;
    }

    public void setEnvironment(MyInvoisEnvironment environment) {
        this.environment = environment;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static final class Builder {
        private final MyInvoisCredential credential = new MyInvoisCredential();

        public Builder userId(Long userId) {
            credential.userId = userId;
            return this;
        }

        public Builder clientId(String clientId) {
            credential.clientId = clientId;
            return this;
        }

        public Builder clientSecretEncrypted(String clientSecretEncrypted) {
            credential.clientSecretEncrypted = clientSecretEncrypted;
            return this;
        }

        public Builder environment(MyInvoisEnvironment environment) {
            credential.environment = environment;
            return this;
        }

        public MyInvoisCredential build() {
            return credential;
        }
    }
}
