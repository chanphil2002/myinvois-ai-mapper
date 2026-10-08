// Shared helpers for how an invoice is labelled across the app.

/** The generated default name when the user didn't enter one, e.g. Invoice-2026-10-07#08. */
export function defaultInvoiceName(id: number, date?: string | null): string {
  const d = (date ?? '').slice(0, 10) || '—';
  return `Invoice-${d}#${String(id).padStart(2, '0')}`;
}

/** The user's chosen name, falling back to the generated default. */
export function invoiceDisplayName(
  invoiceName: string | null | undefined,
  id: number,
  date?: string | null,
): string {
  return invoiceName?.trim() || defaultInvoiceName(id, date);
}
