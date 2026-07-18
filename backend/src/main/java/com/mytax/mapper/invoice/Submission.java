package com.mytax.mapper.invoice;

import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "submissions")
public class Submission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "mapped_invoice_id", nullable = false)
    private Long mappedInvoiceId;

    @Column(name = "myinvois_submission_uid")
    private String myInvoisSubmissionUid;

    @Column(name = "myinvois_document_uuid")
    private String myInvoisDocumentUuid;

    @Enumerated(EnumType.STRING)
    private SubmissionStatus status = SubmissionStatus.PENDING;

    @Column(name = "submitted_at")
    private Instant submittedAt;

    @Column(name = "status_updated_at")
    private Instant statusUpdatedAt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_payload")
    private String responsePayload;

    public Submission() {
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

    public Long getMappedInvoiceId() {
        return mappedInvoiceId;
    }

    public void setMappedInvoiceId(Long mappedInvoiceId) {
        this.mappedInvoiceId = mappedInvoiceId;
    }

    public String getMyInvoisSubmissionUid() {
        return myInvoisSubmissionUid;
    }

    public void setMyInvoisSubmissionUid(String myInvoisSubmissionUid) {
        this.myInvoisSubmissionUid = myInvoisSubmissionUid;
    }

    public String getMyInvoisDocumentUuid() {
        return myInvoisDocumentUuid;
    }

    public void setMyInvoisDocumentUuid(String myInvoisDocumentUuid) {
        this.myInvoisDocumentUuid = myInvoisDocumentUuid;
    }

    public SubmissionStatus getStatus() {
        return status;
    }

    public void setStatus(SubmissionStatus status) {
        this.status = status;
    }

    public Instant getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(Instant submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Instant getStatusUpdatedAt() {
        return statusUpdatedAt;
    }

    public void setStatusUpdatedAt(Instant statusUpdatedAt) {
        this.statusUpdatedAt = statusUpdatedAt;
    }

    public String getResponsePayload() {
        return responsePayload;
    }

    public void setResponsePayload(String responsePayload) {
        this.responsePayload = responsePayload;
    }

    public static final class Builder {
        private final Submission submission = new Submission();

        public Builder mappedInvoiceId(Long mappedInvoiceId) {
            submission.mappedInvoiceId = mappedInvoiceId;
            return this;
        }

        public Builder myInvoisSubmissionUid(String myInvoisSubmissionUid) {
            submission.myInvoisSubmissionUid = myInvoisSubmissionUid;
            return this;
        }

        public Builder myInvoisDocumentUuid(String myInvoisDocumentUuid) {
            submission.myInvoisDocumentUuid = myInvoisDocumentUuid;
            return this;
        }

        public Builder status(SubmissionStatus status) {
            submission.status = status;
            return this;
        }

        public Builder submittedAt(Instant submittedAt) {
            submission.submittedAt = submittedAt;
            return this;
        }

        public Builder statusUpdatedAt(Instant statusUpdatedAt) {
            submission.statusUpdatedAt = statusUpdatedAt;
            return this;
        }

        public Builder responsePayload(String responsePayload) {
            submission.responsePayload = responsePayload;
            return this;
        }

        public Submission build() {
            return submission;
        }
    }
}
