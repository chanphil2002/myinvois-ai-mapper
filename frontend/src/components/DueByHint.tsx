import { Alert } from 'antd';
import { deadlineStatus, CONSOLIDATION_GRACE_DAYS } from '../utils/consolidatedDeadline';

/** Calculated "submit by" date for a consolidated invoice period, with an overdue/soon state. */
export default function DueByHint({ periodEnd }: { periodEnd: string }) {
  const { due, days, overdue } = deadlineStatus(periodEnd);
  const dueText = due.format('D MMM YYYY');
  const note = `LHDN guidance: within ${CONSOLIDATION_GRACE_DAYS} days after month end — confirm against its current rules.`;

  if (overdue) {
    return (
      <Alert
        type="error"
        showIcon
        message={`Past the usual deadline (${dueText}) by ${-days} day${days === -1 ? '' : 's'}`}
        description={`${note} Submit as soon as you can.`}
      />
    );
  }
  const soon = days <= 3;
  return (
    <Alert
      type={soon ? 'warning' : 'info'}
      showIcon
      message={`Submit by ${dueText} — ${days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} left`}`}
      description={note}
    />
  );
}
