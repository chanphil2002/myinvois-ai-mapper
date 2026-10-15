/** "RM 1,234.50" — the one currency format used across the app. */
export const formatRM = (v: number | string | null | undefined) =>
  v == null || v === ''
    ? '—'
    : `RM ${Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
