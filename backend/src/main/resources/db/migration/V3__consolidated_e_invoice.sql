-- Consolidated e-invoice support. One AI extraction of an uploaded document can now produce
-- either one MappedInvoice (existing individual flow, unchanged) or many SalesTransaction rows
-- (new consolidated flow) which get grouped into a ConsolidatedInvoice and submitted as a single
-- MyInvois document. See backend README / UblDocumentBuilder comments for the individual flow;
-- ConsolidatedUblDocumentBuilder is the equivalent for this flow.

CREATE TABLE sales_transactions (
    id                          BIGINT AUTO_INCREMENT PRIMARY KEY,
    document_id                 BIGINT NOT NULL,
    extraction_job_id           BIGINT,
    transaction_date            DATE,
    description                 VARCHAR(500),
    quantity                    DECIMAL(18,4) NOT NULL DEFAULT 1,
    unit_price                  DECIMAL(18,4) NOT NULL DEFAULT 0,
    tax_amount                  DECIMAL(18,4) NOT NULL DEFAULT 0,
    classification_code         VARCHAR(20),
    unit_code                   VARCHAR(10) NOT NULL DEFAULT 'C62',
    buyer_name                  VARCHAR(255),
    buyer_tin                   VARCHAR(50),
    eligible_for_consolidation  BOOLEAN NOT NULL DEFAULT TRUE,
    status                      VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    confidence_score            DECIMAL(5,4),
    created_at                  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_sales_transactions_document FOREIGN KEY (document_id) REFERENCES documents (id),
    CONSTRAINT fk_sales_transactions_extraction_job FOREIGN KEY (extraction_job_id) REFERENCES extraction_jobs (id)
) ENGINE=InnoDB;

CREATE TABLE consolidated_invoices (
    id                  BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id             BIGINT NOT NULL,
    period_start        DATE NOT NULL,
    period_end          DATE NOT NULL,
    invoice_type_code   VARCHAR(10) NOT NULL DEFAULT '01',
    currency_code       VARCHAR(10) NOT NULL DEFAULT 'MYR',
    subtotal            DECIMAL(18,2) NOT NULL DEFAULT 0,
    tax_total           DECIMAL(18,2) NOT NULL DEFAULT 0,
    grand_total         DECIMAL(18,2) NOT NULL DEFAULT 0,
    status              VARCHAR(30) NOT NULL DEFAULT 'DRAFT',
    created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_consolidated_invoices_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE=InnoDB;

-- UNIQUE on sales_transaction_id both doubles as the audit trail (query either direction) and
-- the DB-level guard against a transaction being grouped into more than one consolidated invoice.
CREATE TABLE consolidated_invoice_transactions (
    id                       BIGINT AUTO_INCREMENT PRIMARY KEY,
    consolidated_invoice_id  BIGINT NOT NULL,
    sales_transaction_id     BIGINT NOT NULL UNIQUE,
    CONSTRAINT fk_cit_consolidated_invoice FOREIGN KEY (consolidated_invoice_id) REFERENCES consolidated_invoices (id),
    CONSTRAINT fk_cit_sales_transaction FOREIGN KEY (sales_transaction_id) REFERENCES sales_transactions (id)
) ENGINE=InnoDB;

-- submissions becomes shared between individual and consolidated invoices: exactly one of
-- mapped_invoice_id / consolidated_invoice_id is set per row (enforced in application code,
-- not a DB CHECK constraint — MySQL CHECK support is inconsistent across the versions this
-- app has been run against). Existing rows are unaffected: they already have mapped_invoice_id
-- set and simply gain a NULL consolidated_invoice_id.
ALTER TABLE submissions
    MODIFY COLUMN mapped_invoice_id BIGINT NULL,
    ADD COLUMN consolidated_invoice_id BIGINT NULL,
    ADD CONSTRAINT fk_submissions_consolidated_invoice FOREIGN KEY (consolidated_invoice_id) REFERENCES consolidated_invoices (id);

-- Per-account default submission mode ("configurable ... per customer/business rule" — this app
-- has no separate "customer" entity, so the rule lives on the account's own BusinessProfile).
ALTER TABLE business_profiles
    ADD COLUMN default_submission_mode VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL';

CREATE INDEX idx_sales_transactions_document ON sales_transactions (document_id);
CREATE INDEX idx_sales_transactions_status ON sales_transactions (status);
CREATE INDEX idx_consolidated_invoices_user ON consolidated_invoices (user_id);
CREATE INDEX idx_cit_consolidated_invoice ON consolidated_invoice_transactions (consolidated_invoice_id);
CREATE INDEX idx_submissions_consolidated_invoice ON submissions (consolidated_invoice_id);
