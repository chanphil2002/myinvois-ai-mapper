package com.mytax.mapper.document;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "documents")
public class Document {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_type", nullable = false)
    private String fileType;

    @Column(name = "storage_path", nullable = false)
    private String storagePath;

    @Enumerated(EnumType.STRING)
    private DocumentStatus status = DocumentStatus.UPLOADED;

    @Column(name = "uploaded_at", updatable = false, insertable = false)
    private Instant uploadedAt;

    public Document() {
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

    public String getOriginalFilename() {
        return originalFilename;
    }

    public void setOriginalFilename(String originalFilename) {
        this.originalFilename = originalFilename;
    }

    public String getFileType() {
        return fileType;
    }

    public void setFileType(String fileType) {
        this.fileType = fileType;
    }

    public String getStoragePath() {
        return storagePath;
    }

    public void setStoragePath(String storagePath) {
        this.storagePath = storagePath;
    }

    public DocumentStatus getStatus() {
        return status;
    }

    public void setStatus(DocumentStatus status) {
        this.status = status;
    }

    public Instant getUploadedAt() {
        return uploadedAt;
    }

    public static final class Builder {
        private final Document document = new Document();

        public Builder userId(Long userId) {
            document.userId = userId;
            return this;
        }

        public Builder originalFilename(String originalFilename) {
            document.originalFilename = originalFilename;
            return this;
        }

        public Builder fileType(String fileType) {
            document.fileType = fileType;
            return this;
        }

        public Builder storagePath(String storagePath) {
            document.storagePath = storagePath;
            return this;
        }

        public Builder status(DocumentStatus status) {
            document.status = status;
            return this;
        }

        public Document build() {
            return document;
        }
    }
}
