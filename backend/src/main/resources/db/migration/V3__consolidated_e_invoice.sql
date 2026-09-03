-- Consolidated e-Invoice support: a monthly "batch" of already-mapped invoices (typically many
-- small B2C receipts) that get rolled up into a single e-Invoice addressed to "General Public",
-- matching how LHDN expects high-volume low-ticket sellers to submit (once a month, within 7 days
-- of month end) instead of one e-Invoice per sale. See ConsolidationService for the aggregation
-- logic.
CREATE TABLE consolidation_batches (
    id             BIGINT AUTO_INCREMENT PRIMARY KEY,
    user_id        BIGINT NOT NULL,
    period_year    INT NOT NULL,
    period_month   INT NOT NULL,
    status         VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    generated_at   DATETIME,
    CONSTRAINT fk_consolidation_batches_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT uq_consolidation_batches_period UNIQUE (user_id, period_year, period_month)
) ENGINE=InnoDB;

-- A mapped invoice can now originate two ways: from a single uploaded document (document_id set,
-- as before), or as the synthesized aggregate of a consolidation batch (consolidation_batch_id
-- set, is_consolidation_result = true). Source invoices pulled into an open batch also get
-- consolidation_batch_id set (is_consolidation_result stays false) so they're excluded from
-- future eligibility queries and from individual submission.
ALTER TABLE mapped_invoices
    MODIFY COLUMN document_id BIGINT NULL,
    ADD COLUMN consolidation_batch_id   BIGINT,
    ADD COLUMN is_consolidation_result  TINYINT(1) NOT NULL DEFAULT 0,
    ADD CONSTRAINT fk_mapped_invoices_consolidation_batch
        FOREIGN KEY (consolidation_batch_id) REFERENCES consolidation_batches (id);

CREATE INDEX idx_mapped_invoices_consolidation_batch ON mapped_invoices (consolidation_batch_id);
