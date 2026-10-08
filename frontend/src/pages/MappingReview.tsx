import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Card, Col, DatePicker, Input, InputNumber, Row, Select, Space, Typography, message } from 'antd';
import StatusTag from '../components/StatusTag';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import MappingReviewTable from '../components/MappingReviewTable';
import SourceDocumentCard from '../components/SourceDocumentCard';
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
import { MALAYSIA_STATE_CODES, matchStateCode } from '../constants/malaysiaStates';

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
      // The AI can only extract the buyer's state as a free-text name (never a numeric code) —
      // try to resolve it to a real state code so the Select below preselects it.
      const resolvedStateCode = matchStateCode(invoice.buyerStateCode) ?? invoice.buyerStateCode;
      setDraft({ ...invoice, buyerStateCode: resolvedStateCode });
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

  const field = (label: string, control: ReactNode) => (
    <div>
      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
        {label}
      </Typography.Text>
      <div style={{ marginTop: 4 }}>{control}</div>
    </div>
  );

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header bar: title, status and the primary actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <Space align="center">
          <Typography.Title level={3} style={{ margin: 0 }}>
            Invoice #{draft.id}
          </Typography.Title>
          <StatusTag status={draft.status} />
        </Space>
        <Space wrap>
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
      </div>

      <SourceDocumentCard documentId={draft.documentId} />

      <Card title="Invoice details">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={6}>
            {field(
              'Issue date',
              <DatePicker
                style={{ width: '100%' }}
                disabled={!editable}
                value={draft.issueDate ? dayjs(draft.issueDate) : null}
                onChange={(d) => updateField('issueDate', d ? d.format('YYYY-MM-DD') : null)}
              />,
            )}
          </Col>
          <Col xs={12} sm={6}>
            {field(
              'Currency',
              <Input
                disabled={!editable}
                value={draft.currencyCode}
                onChange={(e) => updateField('currencyCode', e.target.value)}
              />,
            )}
          </Col>
          <Col xs={12} sm={6}>
            {field(
              'Invoice type code',
              <Input
                disabled={!editable}
                value={draft.invoiceTypeCode}
                onChange={(e) => updateField('invoiceTypeCode', e.target.value)}
              />,
            )}
          </Col>
          <Col xs={12} sm={6}>
            {field(
              'Discount total',
              <InputNumber
                style={{ width: '100%' }}
                disabled={!editable}
                value={draft.discountTotal}
                onChange={(v) => updateField('discountTotal', v)}
              />,
            )}
          </Col>
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card
            title="Supplier"
            style={{ height: '100%' }}
            extra={
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                Cross-check only
              </Typography.Text>
            }
          >
            <Typography.Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
              The actual submission uses your Business Profile from Settings.
            </Typography.Paragraph>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              {field(
                'TIN',
                <Input
                  disabled={!editable}
                  value={draft.supplierTin ?? ''}
                  onChange={(e) => updateField('supplierTin', e.target.value)}
                />,
              )}
              {field(
                'Name',
                <Input
                  disabled={!editable}
                  value={draft.supplierName ?? ''}
                  onChange={(e) => updateField('supplierName', e.target.value)}
                />,
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={16}>
          <Card title="Buyer" style={{ height: '100%' }}>
            <Row gutter={[12, 12]}>
              <Col xs={24} sm={12}>
                {field(
                  'TIN',
                  <Input
                    disabled={!editable}
                    value={draft.buyerTin ?? ''}
                    onChange={(e) => updateField('buyerTin', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24} sm={12}>
                {field(
                  'Name',
                  <Input
                    disabled={!editable}
                    value={draft.buyerName ?? ''}
                    onChange={(e) => updateField('buyerName', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24} sm={12}>
                {field(
                  'Identification',
                  <Space.Compact style={{ width: '100%' }}>
                    <Select
                      style={{ width: '40%' }}
                      disabled={!editable}
                      placeholder="ID type"
                      value={draft.buyerIdType ?? undefined}
                      onChange={(v) => updateField('buyerIdType', v)}
                      options={[
                        { value: 'NRIC', label: 'NRIC' },
                        { value: 'BRN', label: 'BRN' },
                        { value: 'PASSPORT', label: 'Passport' },
                        { value: 'ARMY', label: 'Army ID' },
                      ]}
                      allowClear
                    />
                    <Input
                      style={{ width: '60%' }}
                      placeholder="ID number"
                      disabled={!editable}
                      value={draft.buyerIdValue ?? ''}
                      onChange={(e) => updateField('buyerIdValue', e.target.value)}
                    />
                  </Space.Compact>,
                )}
              </Col>
              <Col xs={24} sm={12}>
                {field(
                  'SST registration',
                  <Input
                    disabled={!editable}
                    value={draft.buyerSst ?? ''}
                    onChange={(e) => updateField('buyerSst', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24}>
                {field(
                  'Address line 1',
                  <Input
                    disabled={!editable}
                    value={draft.buyerAddressLine1 ?? ''}
                    onChange={(e) => updateField('buyerAddressLine1', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24}>
                {field(
                  'Address line 2',
                  <Input
                    disabled={!editable}
                    value={draft.buyerAddressLine2 ?? ''}
                    onChange={(e) => updateField('buyerAddressLine2', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24}>
                {field(
                  'City / Postcode / State',
                  <Space.Compact style={{ width: '100%' }}>
                    <Input
                      style={{ width: '40%' }}
                      placeholder="City"
                      disabled={!editable}
                      value={draft.buyerCity ?? ''}
                      onChange={(e) => updateField('buyerCity', e.target.value)}
                    />
                    <Input
                      style={{ width: '25%' }}
                      placeholder="Postcode"
                      disabled={!editable}
                      value={draft.buyerPostalZone ?? ''}
                      onChange={(e) => updateField('buyerPostalZone', e.target.value)}
                    />
                    <Select
                      style={{ width: '35%' }}
                      disabled={!editable}
                      placeholder="State"
                      showSearch
                      optionFilterProp="label"
                      value={draft.buyerStateCode ?? undefined}
                      onChange={(v) => updateField('buyerStateCode', v)}
                      options={MALAYSIA_STATE_CODES}
                      allowClear
                    />
                  </Space.Compact>,
                )}
              </Col>
              <Col xs={24} sm={12}>
                {field(
                  'Phone',
                  <Input
                    disabled={!editable}
                    value={draft.buyerPhone ?? ''}
                    onChange={(e) => updateField('buyerPhone', e.target.value)}
                  />,
                )}
              </Col>
              <Col xs={24} sm={12}>
                {field(
                  'Email',
                  <Input
                    disabled={!editable}
                    value={draft.buyerEmail ?? ''}
                    onChange={(e) => updateField('buyerEmail', e.target.value)}
                  />,
                )}
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

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
