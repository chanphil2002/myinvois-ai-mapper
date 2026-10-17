-- Invoice totals now always follow the line items (subtotal = Σ qty × price, tax = Σ line tax,
-- grand total = subtotal − discount + tax). Bring not-yet-submitted invoices in line; submitted and
-- accepted ones keep the totals LHDN received.
UPDATE mapped_invoices m
    LEFT JOIN (SELECT mapped_invoice_id,
                      ROUND(SUM(COALESCE(quantity, 0) * COALESCE(unit_price, 0)), 2) AS sub,
                      ROUND(SUM(COALESCE(tax_amount, 0)), 2)                         AS tax
               FROM mapped_invoice_line_items
               GROUP BY mapped_invoice_id) li ON li.mapped_invoice_id = m.id
SET m.subtotal    = COALESCE(li.sub, 0),
    m.tax_total   = COALESCE(li.tax, 0),
    m.grand_total = COALESCE(li.sub, 0) - COALESCE(m.discount_total, 0) + COALESCE(li.tax, 0)
WHERE m.status IN ('DRAFT', 'CONFIRMED');

-- "Reviewing" now means ready for LHDN; anything without a positive total goes back to Editing.
UPDATE mapped_invoices SET status = 'DRAFT' WHERE status = 'CONFIRMED' AND (grand_total IS NULL OR grand_total <= 0);
