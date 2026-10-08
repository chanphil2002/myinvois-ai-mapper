import { useParams } from 'react-router-dom';
import { Alert, Button, Card, Col, Row, Space, Table, Typography, message } from 'antd';
import StatusTag from '../components/StatusTag';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SubmissionStatusBadge from '../components/SubmissionStatusBadge';
import {
  confirmConsolidatedInvoice,
  getConsolidatedInvoice,
  listConsolidatedSubmissions,
  refreshSubmission,
  submitConsolidatedInvoice,
} from '../api/endpoints';
import type { SalesTransactionResponse } from '../api/types';

export default function ConsolidatedInvoiceReview() {
  const { id } = useParams();
  const consolidatedInvoiceId = Number(id);
  const queryClient = useQueryClient();

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['consolidated-invoice', consolidatedInvoiceId],
    queryFn: () => getConsolidatedInvoice(consolidatedInvoiceId),
  });

  const { data: submissions } = useQuery({
    queryKey: ['consolidated-submissions', consolidatedInvoiceId],
    queryFn: () => listConsolidatedSubmissions(consolidatedInvoiceId),
    enabled: invoice?.status === 'SUBMITTED' || invoice?.status === 'ACCEPTED' || invoice?.status === 'REJECTED',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['consolidated-invoice', consolidatedInvoiceId] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-submissions', consolidatedInvoiceId] });
  };

  const confirmMutation = useMutation({
    mutationFn: () => confirmConsolidatedInvoice(consolidatedInvoiceId),
    onSuccess: () => {
      message.success('Consolidated invoice confirmed — ready to submit');
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Confirm failed'),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitConsolidatedInvoice(consolidatedInvoiceId),
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

  if (isLoading || !invoice) {
    return <Typography.Text>Loading...</Typography.Text>;
  }

  const columns = [
    { title: 'Date', dataIndex: 'transactionDate', key: 'transactionDate', width: 110 },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 100 },
    { title: 'Tax Amount', dataIndex: 'taxAmount', key: 'taxAmount', width: 100 },
    {
      title: 'Buyer',
      key: 'buyer',
      render: (_: unknown, record: SalesTransactionResponse) =>
        record.buyerName || record.buyerTin ? `${record.buyerName ?? ''} ${record.buyerTin ?? ''}`.trim() : '—',
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card
        title={
          <Space>
            <span>Consolidated Invoice #{invoice.id}</span>
            <StatusTag status={invoice.status} />
          </Space>
        }
        extra={
          <Space>
            {invoice.status === 'DRAFT' && (
              <Button type="primary" onClick={() => confirmMutation.mutate()} loading={confirmMutation.isPending}>
                Confirm
              </Button>
            )}
            {invoice.status === 'CONFIRMED' && (
              <Button type="primary" onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                Submit to MyInvois
              </Button>
            )}
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Period</Typography.Text>
            <div>
              {invoice.periodStart} — {invoice.periodEnd}
            </div>
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Currency</Typography.Text>
            <div>{invoice.currencyCode}</div>
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Invoice type code</Typography.Text>
            <div>{invoice.invoiceTypeCode}</div>
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Subtotal</Typography.Text>
            <div>{invoice.subtotal}</div>
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Tax total</Typography.Text>
            <div>{invoice.taxTotal}</div>
          </Col>
          <Col xs={24} sm={8}>
            <Typography.Text type="secondary">Grand total</Typography.Text>
            <div>{invoice.grandTotal}</div>
          </Col>
        </Row>
        {invoice.status === 'DRAFT' && (
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            To change which transactions are included, build a new consolidated invoice from the Consolidate page.
          </Typography.Paragraph>
        )}
      </Card>

      <Card title={`Transactions (${invoice.transactions.length})`}>
        <Table
          rowKey="id"
          dataSource={invoice.transactions}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      </Card>

      {submissions && submissions.length > 0 && (
        <Card title="Submission history">
          <Space direction="vertical" style={{ width: '100%' }}>
            {submissions.map((s) => (
              <Space key={s.id} direction="vertical" size={4} style={{ width: '100%' }}>
                <Space>
                  <SubmissionStatusBadge status={s.status} />
                  <span>{s.myInvoisSubmissionUid}</span>
                  <Button size="small" loading={refreshMutation.isPending} onClick={() => refreshMutation.mutate(s.id)}>
                    Refresh status
                  </Button>
                </Space>
                {s.errorMessage && <Alert type="error" message={s.errorMessage} showIcon />}
              </Space>
            ))}
          </Space>
        </Card>
      )}
    </Space>
  );
}
