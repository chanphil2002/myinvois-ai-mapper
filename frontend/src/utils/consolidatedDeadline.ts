import dayjs from 'dayjs';

/**
 * Per LHDN's e-Invoice guideline, a consolidated e-Invoice for a month's B2C sales may be issued
 * within 7 calendar days after the end of that month. For a period spanning several months we use
 * the month the period ends in. This is guidance, not legal advice — LHDN's current rules prevail.
 */
export const CONSOLIDATION_GRACE_DAYS = 7;

export function consolidatedDeadline(periodEnd: string) {
  return dayjs(periodEnd).endOf('month').add(CONSOLIDATION_GRACE_DAYS, 'day').startOf('day');
}

export function deadlineStatus(periodEnd: string) {
  const due = consolidatedDeadline(periodEnd);
  const days = due.diff(dayjs().startOf('day'), 'day');
  return { due, days, overdue: days < 0 };
}
