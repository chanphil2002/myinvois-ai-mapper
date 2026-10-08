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
  VALID: 'success',
  INVALID: 'error',
  PARTIALLY_VALID: 'warning',
  PAID: 'success',
  ACTIVE: 'success',
  CANCELLED: 'default',
};

export default function StatusTag({ status }: { status?: string | null }) {
  if (!status) return null;
  return <Tag color={COLORS[status] ?? 'default'}>{status}</Tag>;
}
