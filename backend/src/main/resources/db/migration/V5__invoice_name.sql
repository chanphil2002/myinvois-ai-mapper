-- Optional user-facing name for an invoice. When blank the UI shows a generated
-- default (e.g. Invoice-2026-10-07#08), so this stays nullable.
ALTER TABLE mapped_invoices ADD COLUMN invoice_name VARCHAR(255);
ALTER TABLE consolidated_invoices ADD COLUMN invoice_name VARCHAR(255);
