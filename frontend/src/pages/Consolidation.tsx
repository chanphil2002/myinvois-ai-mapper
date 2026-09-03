import { useState } from 'react';
import { Alert, Button, Card, InputNumber, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  addInvoiceToBatch,
  generateConsolidatedInvoice,
  getConsolidationBatch,
  getOrCreateConsolidationBatch,
  listConsolidationBatches,
  listEligibleInvoicesForBatch,
  removeInvoiceFromBatch,
} from '../api/endpoints';
import type { MappedInvoiceResponse } from '../api/types';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function periodLabel(year: number, month: number) {
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

export default function Consolidation() {
  const queryClient = useQueryClient();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [activeBatchId, setActiveBatchId] = useState<number | null>(null);

  const { data: pastBatches } = useQuery({ queryKey: ['consolidation-batches'], queryFn: listConsolidationBatches });

  const { data: batch, isLoading: batchLoading } = useQuery({
    queryKey: ['consolidation-batch', activeBatchId],
    queryFn: () => getConsolidationBatch(activeBatchId as number),
    enabled: activeBatchId !== null,
  });

  const { data: eligible, isLoading: eligibleLoading } = useQuery({
    queryKey: ['consolidation-eligible', activeBatchId],
    queryFn: () => listEligibleInvoicesForBatch(activeBatchId as number),
    enabled: activeBatchId !== null && batch?.status === 'OPEN',
  });

  const invalidateBatch = () => {
    queryClient.invalidateQueries({ queryKey: ['consolidation-batch', activeBatchId] });
    queryClient.invalidateQueries({ queryKey: ['consolidation-eligible', activeBatchId] });
    queryClient.invalidateQueries({ queryKey: ['consolidation-batches'] });
  };

  const openMutation = useMutation({
    mutationFn: () => getOrCreateConsolidationBatch(year, month),
    onSuccess: (result) => {
      setActiveBatchId(result.id);
      queryClient.setQueryData(['consolidation-batch', result.id], result);
      queryClient.invalidateQueries({ queryKey: ['consolidation-batches'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to open period'),
  });

  const addMutation = useMutation({
    mutationFn: (invoiceId: number) => addInvoiceToBatch(activeBatchId as number, invoiceId),
    onSuccess: invalidateBatch,
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to add invoice'),
  });

  const removeMutation = useMutation({
    mutationFn: (invoiceId: number) => removeInvoiceFromBatch(activeBatchId as number, invoiceId),
    onSuccess: invalidateBatch,
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to remove invoice'),
  });

  const generateMutation = useMutation({
    mutationFn: () => generateConsolidatedInvoice(activeBatchId as number),
    onSuccess: () => {
      message.success('Consolidated e-Invoice generated — review it before confirming and submitting');
      invalidateBatch();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to generate'),
  });

  const invoiceColumns = (action: { label: string; onClick: (record: MappedInvoiceResponse) => void; loading: boolean }) => [
    { title: 'Invoice #', dataIndex: 'id', key: 'id', width: 90 },
    {
      title: 'Issue date',
      dataIndex: 'issueDate',
      key: 'issueDate',
      render: (v: string | null) => v ?? <Typography.Text type="secondary">unknown</Typography.Text>,
    },
    { title: 'Classification', dataIndex: 'lineItems', key: 'classification', render: (items: MappedInvoiceResponse['lineItems']) => items[0]?.classificationCode ?? '—' },
    { title: 'Grand total', dataIndex: 'grandTotal', key: 'grandTotal', render: (v: number | null) => v?.toFixed(2) ?? '—' },
    {
      title: '',
      key: 'action',
      render: (_: unknown, record: MappedInvoiceResponse) => (
        <Button size="small" loading={action.loading} onClick={() => action.onClick(record)}>
          {action.label}
        </Button>
      ),
    },
  ];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={4}>Consolidated e-Invoice</Typography.Title>
        <Typography.Paragraph type="secondary">
          For high-volume, low-value B2C sales (retail, F&amp;B, repair shops, etc.) that LHDN lets you
          report as one monthly e-Invoice to "General Public" instead of one per sale. Pick a month, add
          the receipts already mapped for that period, then generate — the result is an ordinary mapped
          invoice you review, confirm and submit like any other.
        </Typography.Paragraph>
        <Space>
          <Select
            value={month}
            onChange={setMonth}
            style={{ width: 160 }}
            options={MONTH_NAMES.map((name, idx) => ({ value: idx + 1, label: name }))}
          />
          <InputNumber value={year} onChange={(v) => setYear(v ?? now.getFullYear())} style={{ width: 100 }} />
          <Button type="primary" loading={openMutation.isPending} onClick={() => openMutation.mutate()}>
            Open period
          </Button>
        </Space>
      </Card>

      {pastBatches && pastBatches.length > 0 && (
        <Card title="Past periods" size="small">
          <Space wrap>
            {pastBatches.map((b) => (
              <Button
                key={b.id}
                type={activeBatchId === b.id ? 'primary' : 'default'}
                size="small"
                onClick={() => setActiveBatchId(b.id)}
              >
                {periodLabel(b.periodYear, b.periodMonth)} <Tag style={{ marginLeft: 8 }}>{b.status}</Tag>
              </Button>
            ))}
          </Space>
        </Card>
      )}

      {activeBatchId !== null && (
        <Card
          loading={batchLoading}
          title={
            batch && (
              <Space>
                <span>{periodLabel(batch.periodYear, batch.periodMonth)}</span>
                <Tag color={batch.status === 'GENERATED' ? 'green' : 'blue'}>{batch.status}</Tag>
              </Space>
            )
          }
          extra={
            batch?.status === 'OPEN' && (
              <Button
                type="primary"
                disabled={batch.items.length === 0}
                loading={generateMutation.isPending}
                onClick={() => generateMutation.mutate()}
              >
                Generate consolidated e-Invoice ({batch.items.length})
              </Button>
            )
          }
        >
          {batch && batch.status === 'GENERATED' && batch.resultInvoice && (
            <Alert
              type="success"
              showIcon
              style={{ marginBottom: 16 }}
              message={
                <span>
                  Consolidated e-Invoice #{batch.resultInvoice.id} generated — grand total{' '}
                  {batch.resultInvoice.grandTotal?.toFixed(2)} {batch.resultInvoice.currencyCode}.{' '}
                  <Link to={`/mapped-invoices/${batch.resultInvoice.id}`}>Review, confirm &amp; submit it</Link>
                </span>
              }
            />
          )}

          {batch && (
            <>
              <Typography.Text strong>Invoices in this batch ({batch.items.length})</Typography.Text>
              <Table
                style={{ marginTop: 8, marginBottom: 24 }}
                rowKey="id"
                size="small"
                dataSource={batch.items}
                pagination={{ pageSize: 10 }}
                columns={
                  batch.status === 'OPEN'
                    ? invoiceColumns({ label: 'Remove', onClick: (r) => removeMutation.mutate(r.id), loading: removeMutation.isPending })
                    : invoiceColumns({ label: 'View', onClick: (r) => window.open(`/mapped-invoices/${r.id}`, '_blank') , loading: false })
                }
              />
            </>
          )}

          {batch?.status === 'OPEN' && (
            <>
              <Typography.Text strong>Eligible invoices for {periodLabel(batch.periodYear, batch.periodMonth)}</Typography.Text>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 8 }}>
                DRAFT or CONFIRMED invoices not yet in any batch, mapped from receipts dated in this period
                (or with no recognized date).
              </Typography.Paragraph>
              <Table
                rowKey="id"
                size="small"
                loading={eligibleLoading}
                dataSource={eligible ?? []}
                pagination={{ pageSize: 10 }}
                columns={invoiceColumns({ label: 'Add', onClick: (r) => addMutation.mutate(r.id), loading: addMutation.isPending })}
              />
            </>
          )}
        </Card>
      )}
    </Space>
  );
}
