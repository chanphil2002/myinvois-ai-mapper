-- Correcting e-invoices already issued to LHDN. LHDN has no "edit" API: within 72 hours of
-- validation the issuer may CANCEL (then submit a corrected document); after that the correction is
-- a CREDIT NOTE (type 02) that references the original document's internal ID and UUID.

ALTER TABLE submissions
    ADD COLUMN internal_id   VARCHAR(60)  NULL COMMENT 'Document ID sent to LHDN, e.g. INV-12 or INV-12-R2',
    ADD COLUMN cancelled_at  DATETIME     NULL,
    ADD COLUMN cancel_reason VARCHAR(300) NULL;

UPDATE submissions SET internal_id = CONCAT('INV-', mapped_invoice_id) WHERE mapped_invoice_id IS NOT NULL;
UPDATE submissions SET internal_id = CONCAT('CON-', consolidated_invoice_id) WHERE consolidated_invoice_id IS NOT NULL;

-- A credit note is a mapped invoice (invoice_type_code '02') pointing at the invoice it corrects.
ALTER TABLE mapped_invoices
    ADD COLUMN original_invoice_id    BIGINT       NULL,
    ADD COLUMN original_document_uuid VARCHAR(100) NULL,
    ADD COLUMN original_internal_id   VARCHAR(60)  NULL;
