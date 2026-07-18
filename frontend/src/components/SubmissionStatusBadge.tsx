import { Tag } from 'antd';
import type { SubmissionStatus } from '../api/types';

const COLORS: Record<SubmissionStatus, string> = {
  PENDING: 'default',
  IN_PROGRESS: 'processing',
  VALID: 'success',
  INVALID: 'error',
  PARTIALLY_VALID: 'warning',
};

export default function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return <Tag color={COLORS[status]}>{status}</Tag>;
}
