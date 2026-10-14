package com.mytax.mapper.usage;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

/** One recorded AI parse (mapping or extraction) — the server-side source of truth for usage. */
@Entity
@Table(name = "ai_usage_events")
public class AiUsageEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(nullable = false)
    private String operation;

    @Column(name = "document_id")
    private Long documentId;

    @Column(name = "prompt_tokens")
    private Integer promptTokens;

    /** Response tokens (the JSON answer). */
    @Column(name = "output_tokens")
    private Integer outputTokens;

    /** "Thinking" tokens — billed as output, and the main source of cost variance between parses. */
    @Column(name = "thought_tokens")
    private Integer thoughtTokens;

    @Column(name = "cost_usd", precision = 12, scale = 6)
    private java.math.BigDecimal costUsd;

    /** False for an attempt whose output was rejected and retried (it still cost tokens). */
    private Boolean success;

    @Column(name = "created_at", updatable = false, insertable = false)
    private Instant createdAt;

    protected AiUsageEvent() {
    }

    public AiUsageEvent(Long userId, String operation, Long documentId) {
        this.userId = userId;
        this.operation = operation;
        this.documentId = documentId;
    }

    public AiUsageEvent(Long userId, String operation, Long documentId, Integer promptTokens, Integer outputTokens,
                        Integer thoughtTokens, java.math.BigDecimal costUsd, boolean success) {
        this(userId, operation, documentId);
        this.promptTokens = promptTokens;
        this.outputTokens = outputTokens;
        this.thoughtTokens = thoughtTokens;
        this.costUsd = costUsd;
        this.success = success;
    }

    public java.math.BigDecimal getCostUsd() {
        return costUsd;
    }

    public Long getId() {
        return id;
    }

    public Long getUserId() {
        return userId;
    }

    public String getOperation() {
        return operation;
    }

    public Long getDocumentId() {
        return documentId;
    }

    public Instant getCreatedAt() {
        return createdAt;
    }
}
