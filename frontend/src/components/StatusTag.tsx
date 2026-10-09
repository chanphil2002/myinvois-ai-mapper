import { Tag } from 'antd';

// Unified colour mapping for invoice / consolidated / submission statuses across the app.
const COLORS: Record<string, string> = {
  DRAFT: 'default',
  CONFIRMED: 'blue',
  SUBMITTED: 'processing',
  ACCEPTED: 'success',
  REJECTED: 'error',
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  PARSING: 'processing',
  VALID: 'success',
  INVALID: 'error',
  PARTIALLY_VALID: 'warning',
  PAID: 'success',
  ACTIVE: 'success',
  CANCELLED: 'default',
};

// Human-friendly labels shown to the user (the raw enum names are developer-facing).
const LABELS: Record<string, string> = {
  DRAFT: 'Editing',
  CONFIRMED: 'Reviewing',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Failed',
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  PARSING: 'Parsing…',
  VALID: 'Valid',
  INVALID: 'Invalid',
  PARTIALLY_VALID: 'Partial',
  PAID: 'Paid',
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
};

export default function StatusTag({ status }: { status?: string | null }) {
  if (!status) return null;
  return (
    <Tag color={COLORS[status] ?? 'default'} style={{ marginInlineEnd: 0 }}>
      {LABELS[status] ?? status}
    </Tag>
  );
}
