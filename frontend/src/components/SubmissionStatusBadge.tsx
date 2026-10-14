import type { SubmissionStatus } from '../api/types';
import StatusTag from './StatusTag';

/** LHDN submission status — same palette-driven tag as invoice statuses. */
export default function SubmissionStatusBadge({ status }: { status: SubmissionStatus }) {
  return <StatusTag status={status} />;
}
