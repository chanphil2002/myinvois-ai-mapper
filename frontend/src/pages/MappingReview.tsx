import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Col, DatePicker, Input, Row, Space, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import MappingReviewTable from '../components/MappingReviewTable';
import SubmissionStatusBadge from '../components/SubmissionStatusBadge';
import {
  confirmMappedInvoice,
  getMappedInvoice,
  listSubmissions,
  refreshSubmission,
  submitMappedInvoice,
  updateMappedInvoice,
} from '../api/endpoints';
import type { LineItem, MappedInvoiceResponse } from '../api/types';

export default function MappingReview() {
  const { id } = useParams();
  const mappedInvoiceId = Number(id);
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MappedInvoiceResponse | null>(null);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['mapped-invoice', mappedInvoiceId],
    queryFn: () => getMappedInvoice(mappedInvoiceId),
  });

  const { data: submissions } = useQuery({
    queryKey: ['submissions', mappedInvoiceId],
    queryFn: () => listSubmissions(mappedInvoiceId),
    enabled: invoice?.status === 'SUBMITTED' || invoice?.status === 'ACCEPTED' || invoice?.status === 'REJECTED',
  });

  useEffect(() => {
    if (invoice) {
      setDraft(invoice);
    }
  }, [invoice]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['mapped-invoice', mappedInvoiceId] });
    queryClient.invalidateQueries({ queryKey: ['submissions', mappedInvoiceId] });
  };

  const saveMutation = useMutation({
    mutationFn: (payload: MappedInvoiceResponse) => updateMappedInvoice(mappedInvoiceId, payload),
    onSuccess: () => {
      message.success('Changes saved');
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Save failed'),
  });

  const confirmMutation = useMutation({
    mutationFn: () => confirmMappedInvoice(mappedInvoiceId),
    onSuccess: () => {
      message.success('Invoice confirmed — ready to submit');
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Confirm failed'),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitMappedInvoice(mappedInvoiceId),
    onSuccess: () => {
      message.success('Submitted to MyInvois');
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Submission failed'),
  });

  const refreshMutation = useMutation({
    mutationFn: (submissionId: number) => refreshSubmission(submissionId),
    onSuccess: () => {
      message.success('Status refreshed');
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Refresh failed'),
  });

  if (isLoading || !draft) {
    return <Typography.Text>Loading...</Typography.Text>;
  }

  const editable = draft.status === 'DRAFT';

  const updateField = <K extends keyof MappedInvoiceResponse>(field: K, value: MappedInvoiceResponse[K]) => {
    setDraft({ ...draft, [field]: value });
  };

  const updateLineItems = (lineItems: LineItem[]) => {
    setDraft({ ...draft, lineItems });
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span>Mapped Invoice #{draft.id}</span>
            <Tag>{draft.status}</Tag>
          </Space>
        }
        extra={
          <Space>
            {editable && (
              <Button onClick={() => saveMutation.mutate(draft)} loading={saveMutation.isPending}>
                Save changes
              </Button>
            )}
            {editable && (
              <Button type="primary" onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending}>
                Confirm
              </Button>
            )}
            {draft.status === 'CONFIRMED' && (
              <Button type="primary" onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                Submit to MyInvois
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={16}>
          <Col span={8}>
            <Typography.Text type="secondary">Issue date</Typography.Text>
            <DatePicker
              style={{ width: '100%' }}
              disabled={!editable}
              value={draft.issueDate ? dayjs(draft.issueDate) : null}
              onChange={(d) => updateField('issueDate', d ? d.format('YYYY-MM-DD') : null)}
            />
          </Col>
          <Col span={8}>
            <Typography.Text type="secondary">Currency</Typography.Text>
            <Input
              disabled={!editable}
              value={draft.currencyCode}
              onChange={(e) => updateField('currencyCode', e.target.value)}
            />
          </Col>
          <Col span={8}>
            <Typography.Text type="secondary">Invoice type code</Typography.Text>
            <Input
              disabled={!editable}
              value={draft.invoiceTypeCode}
              onChange={(e) => updateField('invoiceTypeCode', e.target.value)}
            />
          </Col>
        </Row>
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Typography.Text strong>Supplier</Typography.Text>
            <Input
              placeholder="TIN"
              disabled={!editable}
              value={draft.supplierTin ?? ''}
              onChange={(e) => updateField('supplierTin', e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Input
              placeholder="Name"
              disabled={!editable}
              value={draft.supplierName ?? ''}
              onChange={(e) => updateField('supplierName', e.target.value)}
              style={{ marginTop: 8 }}
            />
          </Col>
          <Col span={12}>
            <Typography.Text strong>Buyer</Typography.Text>
            <Input
              placeholder="TIN"
              disabled={!editable}
              value={draft.buyerTin ?? ''}
              onChange={(e) => updateField('buyerTin', e.target.value)}
              style={{ marginTop: 8 }}
            />
            <Input
              placeholder="Name"
              disabled={!editable}
              value={draft.buyerName ?? ''}
              onChange={(e) => updateField('buyerName', e.target.value)}
              style={{ marginTop: 8 }}
            />
          </Col>
        </Row>
      </Card>

      <Card title="Line items">
        <MappingReviewTable lineItems={draft.lineItems} onChange={updateLineItems} disabled={!editable} />
      </Card>

      {submissions && submissions.length > 0 && (
        <Card title="Submission history">
          <Space direction="vertical">
            {submissions.map((s) => (
              <Space key={s.id}>
                <SubmissionStatusBadge status={s.status} />
                <span>{s.myInvoisSubmissionUid}</span>
                <Button size="small" loading={refreshMutation.isPending} onClick={() => refreshMutation.mutate(s.id)}>
                  Refresh status
                </Button>
              </Space>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
}
