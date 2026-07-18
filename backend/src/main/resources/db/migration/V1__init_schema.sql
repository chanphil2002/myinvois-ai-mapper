CREATE TABLE users (
    id              BIGINT AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    company_name    VARCHAR(255) NOT NULL,
    tin             VARCHAR(50),
    role            VARCHAR(30) NOT NULL DEFAULT 'OWNER',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE myinvois_credentials (
    id                      BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id                 BIGINT NOT NULL,
    client_id               VARCHAR(255) NOT NULL,
    client_secret_encrypted TEXT NOT NULL,
    environment             VARCHAR(20) NOT NULL DEFAULT 'SANDBOX',
    created_at              DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_myinvois_credentials_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE documents (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    original_filename   VARCHAR(500) NOT NULL,
    file_type           VARCHAR(50) NOT NULL,
    storage_path        VARCHAR(1000) NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'UPLOADED',
    uploaded_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_documents_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE TABLE extraction_jobs (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id         BIGINT NOT NULL,
    status              VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    ai_model            VARCHAR(100),
    raw_ai_response     JSON,
    error_message       TEXT,
    started_at          DATETIME,
    completed_at        DATETIME,
    CONSTRAINT fk_extraction_jobs_document FOREIGN KEY (document_id) REFERENCES documents (id)
) ENGINE=InnoDB;

CREATE TABLE mapped_invoices (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id         BIGINT NOT NULL,
    extraction_job_id   BIGINT,
    invoice_type_code   VARCHAR(10) NOT NULL DEFAULT '01',
    issue_date          DATE,
    currency_code       VARCHAR(10) NOT NULL DEFAULT 'MYR',
    supplier_tin        VARCHAR(50),
    supplier_name       VARCHAR(255),
    buyer_tin           VARCHAR(50),
    buyer_name           VARCHAR(255),
    subtotal            DECIMAL(18,2),
    tax_total           DECIMAL(18,2),
    grand_total          DECIMAL(18,2),
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    confidence_score    DECIMAL(5,4),
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_mapped_invoices_document FOREIGN KEY (document_id) REFERENCES documents (id),
    CONSTRAINT fk_mapped_invoices_extraction_job FOREIGN KEY (extraction_job_id) REFERENCES extraction_jobs (id)
) ENGINE=InnoDB;

CREATE TABLE mapped_invoice_line_items (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    mapped_invoice_id   BIGINT NOT NULL,
    line_no             INT NOT NULL,
    description         VARCHAR(500),
    quantity            DECIMAL(18,4) NOT NULL DEFAULT 1,
    unit_price          DECIMAL(18,4) NOT NULL DEFAULT 0,
    tax_amount          DECIMAL(18,4) NOT NULL DEFAULT 0,
    classification_code VARCHAR(20),
    confidence_score    DECIMAL(5,4),
    CONSTRAINT fk_line_items_mapped_invoice FOREIGN KEY (mapped_invoice_id) REFERENCES mapped_invoices (id)
) ENGINE=InnoDB;

CREATE TABLE submissions (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    mapped_invoice_id        BIGINT NOT NULL,
    myinvois_submission_uid  VARCHAR(100),
    myinvois_document_uuid   VARCHAR(100),
    status                   VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    submitted_at             DATETIME,
    status_updated_at        DATETIME,
    response_payload         JSON,
    CONSTRAINT fk_submissions_mapped_invoice FOREIGN KEY (mapped_invoice_id) REFERENCES mapped_invoices (id)
) ENGINE=InnoDB;

CREATE TABLE audit_log (
    id            BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id       BIGINT,
    entity_type   VARCHAR(100) NOT NULL,
    entity_id     BIGINT,
    action        VARCHAR(100) NOT NULL,
    detail        JSON,
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_audit_log_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

CREATE INDEX idx_documents_user ON documents (user_id);
CREATE INDEX idx_extraction_jobs_document ON extraction_jobs (document_id);
CREATE INDEX idx_mapped_invoices_document ON mapped_invoices (document_id);
CREATE INDEX idx_line_items_mapped_invoice ON mapped_invoice_line_items (mapped_invoice_id);
CREATE INDEX idx_submissions_mapped_invoice ON submissions (mapped_invoice_id);
CREATE INDEX idx_audit_log_user ON audit_log (user_id);
