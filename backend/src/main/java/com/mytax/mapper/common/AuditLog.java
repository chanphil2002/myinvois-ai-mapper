package com.mytax.mapper.common;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "audit_log")
public class AuditLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id")
    private Long userId;

    @Column(name = "entity_type", nullable = false)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    @Column(nullable = false)
    private String action;

    @JdbcTypeCode(SqlTypes.JSON)
    private String detail;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    public AuditLog() {
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

    public String getEntityType() {
        return entityType;
    }

    public void setEntityType(String entityType) {
        this.entityType = entityType;
    }

    public Long getEntityId() {
        return entityId;
    }

    public void setEntityId(Long entityId) {
        this.entityId = entityId;
    }

    public String getAction() {
        return action;
    }

    public void setAction(String action) {
        this.action = action;
    }

    public String getDetail() {
        return detail;
    }

    public void setDetail(String detail) {
        this.detail = detail;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }

    public static final class Builder {
        private final AuditLog log = new AuditLog();

        public Builder userId(Long userId) {
            log.userId = userId;
            return this;
        }

        public Builder entityType(String entityType) {
            log.entityType = entityType;
            return this;
        }

        public Builder entityId(Long entityId) {
            log.entityId = entityId;
            return this;
        }

        public Builder action(String action) {
            log.action = action;
            return this;
        }

        public Builder detail(String detail) {
            log.detail = detail;
            return this;
        }

        public AuditLog build() {
            return log;
        }
    }
}
