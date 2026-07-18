package com.mytax.mapper.mapping;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "extraction_jobs")
public class ExtractionJob {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "document_id", nullable = false)
    private Long documentId;

    @Enumerated(EnumType.STRING)
    private ExtractionJobStatus status = ExtractionJobStatus.PENDING;

    @Column(name = "ai_model")
    private String aiModel;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "raw_ai_response")
    private String rawAiResponse;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    public ExtractionJob() {
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

    public Long getDocumentId() {
        return documentId;
    }

    public void setDocumentId(Long documentId) {
        this.documentId = documentId;
    }

    public ExtractionJobStatus getStatus() {
        return status;
    }

    public void setStatus(ExtractionJobStatus status) {
        this.status = status;
    }

    public String getAiModel() {
        return aiModel;
    }

    public void setAiModel(String aiModel) {
        this.aiModel = aiModel;
    }

    public String getRawAiResponse() {
        return rawAiResponse;
    }

    public void setRawAiResponse(String rawAiResponse) {
        this.rawAiResponse = rawAiResponse;
    }

    public String getErrorMessage() {
        return errorMessage;
    }

    public void setErrorMessage(String errorMessage) {
        this.errorMessage = errorMessage;
    }

    public Instant getStartedAt() {
        return startedAt;
    }

    public void setStartedAt(Instant startedAt) {
        this.startedAt = startedAt;
    }

    public Instant getCompletedAt() {
        return completedAt;
    }

    public void setCompletedAt(Instant completedAt) {
        this.completedAt = completedAt;
    }

    public static final class Builder {
        private final ExtractionJob job = new ExtractionJob();

        public Builder documentId(Long documentId) {
            job.documentId = documentId;
            return this;
        }

        public Builder status(ExtractionJobStatus status) {
            job.status = status;
            return this;
        }

        public Builder startedAt(Instant startedAt) {
            job.startedAt = startedAt;
            return this;
        }

        public ExtractionJob build() {
            return job;
        }
    }
}
