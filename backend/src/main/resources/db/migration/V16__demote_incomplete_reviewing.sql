-- "Reviewing" now requires LHDN's mandatory buyer fields; invoices confirmed before that rule existed
-- without them go back to Editing. (The full check — lines, totals, supplier — runs on confirm and submit.)
UPDATE mapped_invoices
SET status = 'DRAFT'
WHERE status = 'CONFIRMED'
  AND (COALESCE(TRIM(buyer_name), '') = '' OR COALESCE(TRIM(buyer_tin), '') = ''
    OR COALESCE(TRIM(buyer_id_type), '') = '' OR COALESCE(TRIM(buyer_id_value), '') = ''
    OR COALESCE(TRIM(buyer_sst), '') = '' OR COALESCE(TRIM(buyer_address_line1), '') = ''
    OR COALESCE(TRIM(buyer_city), '') = '' OR COALESCE(TRIM(buyer_state_code), '') = ''
    OR COALESCE(TRIM(buyer_country_code), '') = '' OR COALESCE(TRIM(buyer_phone), '') = '');
