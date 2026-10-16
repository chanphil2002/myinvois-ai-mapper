import { useState } from 'react';
import { Alert, Button, Card, Input, Modal, Space, Typography, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import { cancelSubmission, createCreditNote, refreshSubmission } from '../api/endpoints';
import type { SubmissionResponse } from '../api/types';
import SubmissionStatusBadge from './SubmissionStatusBadge';
import EnvironmentTag from './EnvironmentTag';
import { useTheme } from '../theme/ThemeContext';

interface Props {
  submissions: SubmissionResponse[];
  /** Query keys to refresh after any action (invoice + its submissions). */
  invalidateKeys: unknown[][];
  /** Individual invoices only: id used to start a credit note after the 72-hour window. */
  creditNoteFor?: number;
}

/**
 * LHDN submission history with the correction paths LHDN allows. There is no "edit" API: within
 * 72 hours of validation the issuer can cancel (then fix and resubmit); after that, a credit note.
 */
export default function SubmissionHistoryCard({ submissions, invalidateKeys, creditNoteFor }: Props) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { palette } = useTheme();
  const [cancelling, setCancelling] = useState<SubmissionResponse | null>(null);
  const [reason, setReason] = useState('');

  const invalidate = () => invalidateKeys.forEach((k) => queryClient.invalidateQueries({ queryKey: k }));
  const onErr = (fallback: string) => (err: unknown) => message.error(err instanceof Error ? err.message : fallback);

  const refresh = useMutation({
    mutationFn: (id: number) => refreshSubmission(id),
    onSuccess: () => {
      message.success('Status refreshed');
      invalidate();
    },
    onError: onErr('Refresh failed'),
  });

  const cancel = useMutation({
    mutationFn: () => cancelSubmission(cancelling!.id, reason.trim()),
    onSuccess: () => {
      message.success('Cancelled at LHDN — the invoice is open for editing. Fix it, confirm and submit again.');
      setCancelling(null);
      setReason('');
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
    onError: onErr('Could not cancel at LHDN'),
  });

  const creditNote = useMutation({
    mutationFn: () => createCreditNote(creditNoteFor!),
    onSuccess: (note) => {
      message.success('Credit note started — set the amounts to credit, then confirm and submit');
      queryClient.invalidateQueries({ queryKey: ['mapped-invoices'] });
      navigate(`/mapped-invoices/${note.id}`);
    },
    onError: onErr('Could not start a credit note'),
  });

  if (submissions.length === 0) return null;
  const now = dayjs();

  return (
    <Card title="Submission history">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {submissions.map((s) => {
          const cancellable = s.status === 'VALID' && !!s.cancellableUntil && now.isBefore(dayjs(s.cancellableUntil));
          const windowPassed = s.status === 'VALID' && !!s.cancellableUntil && !cancellable;
          return (
            <div
              key={s.id}
              style={{ paddingBottom: 12, borderBottom: `1px solid ${palette.border}`, display: 'grid', gap: 8 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
                <SubmissionStatusBadge status={s.status} />
                <EnvironmentTag environment={s.environment} />
                {s.internalId && (
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {s.internalId}
                  </Typography.Text>
                )}
                <Typography.Text
                  type="secondary"
                  style={{ fontSize: 12, wordBreak: 'break-all', flex: '1 1 140px', minWidth: 0 }}
                >
                  {s.myInvoisSubmissionUid}
                </Typography.Text>
              </div>
              {s.errorMessage && s.status === 'INVALID' && <Alert type="error" message={s.errorMessage} showIcon />}
              {s.status === 'CANCELLED' && (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Cancelled {s.cancelledAt ? dayjs(s.cancelledAt).format('D MMM YYYY, h:mm a') : ''}
                  {s.cancelReason ? ` — “${s.cancelReason}”` : ''}
                </Typography.Text>
              )}
              {cancellable && (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  Spotted a mistake? You can cancel this at LHDN until{' '}
                  <strong>{dayjs(s.cancellableUntil).format('D MMM, h:mm a')}</strong>, then correct and resubmit.
                </Typography.Text>
              )}
              {windowPassed && (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  The 72-hour cancellation window has passed.{' '}
                  {creditNoteFor ? 'To correct it, issue a credit note.' : 'Corrections now need a credit note.'}
                </Typography.Text>
              )}
              <Space wrap>
                {s.status !== 'CANCELLED' && (
                  <Button loading={refresh.isPending && refresh.variables === s.id} onClick={() => refresh.mutate(s.id)}>
                    Refresh status
                  </Button>
                )}
                {cancellable && (
                  <Button danger onClick={() => setCancelling(s)}>
                    Cancel &amp; correct
                  </Button>
                )}
                {windowPassed && creditNoteFor && (
                  <Button loading={creditNote.isPending} onClick={() => creditNote.mutate()}>
                    Issue credit note
                  </Button>
                )}
              </Space>
            </div>
          );
        })}
      </Space>

      <Modal
        open={cancelling !== null}
        title="Cancel this e-invoice at LHDN?"
        okText="Cancel at LHDN"
        okButtonProps={{ danger: true, disabled: reason.trim().length === 0 }}
        cancelText="Keep it"
        confirmLoading={cancel.isPending}
        onOk={() => cancel.mutate()}
        onCancel={() => {
          setCancelling(null);
          setReason('');
        }}
      >
        <Typography.Paragraph type="secondary">
          LHDN doesn't allow editing an issued e-invoice. Cancelling voids it at LHDN and reopens it here as a draft, so
          you can correct the details and submit again (it gets a new document ID, e.g. {cancelling?.internalId}-R2).
          {cancelling?.environment === 'PRODUCTION' && ' Your buyer will see that this invoice was cancelled.'}
        </Typography.Paragraph>
        <Typography.Text strong>Reason (sent to LHDN)</Typography.Text>
        <Input.TextArea
          rows={3}
          maxLength={300}
          showCount
          value={reason}
          placeholder="e.g. Wrong buyer TIN"
          onChange={(e) => setReason(e.target.value)}
          style={{ marginTop: 6 }}
        />
      </Modal>
    </Card>
  );
}
