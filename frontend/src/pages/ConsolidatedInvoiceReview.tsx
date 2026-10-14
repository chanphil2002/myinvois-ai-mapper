import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Alert, Button, Card, Col, DatePicker, Input, Row, Space, Table, Tabs, Tag, Typography, message } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import StatusTag from '../components/StatusTag';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import SubmissionStatusBadge from '../components/SubmissionStatusBadge';
import Page from '../components/Page';
import { tablePagination } from '../utils/pagination';
import ConsolidatedSteps from '../components/ConsolidatedSteps';
import DueByHint from '../components/DueByHint';
import ManualSalesForm from '../components/ManualSalesForm';
import FileUploadDropzone from '../components/FileUploadDropzone';
import TransactionSelectionTable from '../components/TransactionSelectionTable';
import {
  addConsolidatedLines,
  attachTransactions,
  confirmConsolidatedInvoice,
  extractTransactions,
  getConsolidatedInvoice,
  listConsolidatedSubmissions,
  listEligibleTransactions,
  refreshSubmission,
  removeConsolidatedTransaction,
  submitConsolidatedInvoice,
  updateConsolidatedDetails,
  uploadDocument,
} from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, SalesTransactionResponse } from '../api/types';
import { useUpload } from '../upload/UploadContext';
import { invoiceDisplayName } from '../utils/invoice';

// Attaches run one at a time: each is a read-merge-write of the draft's transaction set, so
// concurrent uploads finishing together must not overwrite each other.
let attachChain: Promise<unknown> = Promise.resolve();
const queueAttach = <T,>(fn: () => Promise<T>): Promise<T> => {
  const next = attachChain.then(fn, fn);
  attachChain = next.catch(() => undefined);
  return next;
};

const outsidePeriod = (t: SalesTransactionResponse, inv: ConsolidatedInvoiceResponse) =>
  !!t.transactionDate && (t.transactionDate < inv.periodStart || t.transactionDate > inv.periodEnd);

function DetailsEditor({ invoice, onSaved }: { invoice: ConsolidatedInvoiceResponse; onSaved: () => void }) {
  const [name, setName] = useState(invoice.invoiceName ?? '');
  const [period, setPeriod] = useState<[Dayjs, Dayjs]>([dayjs(invoice.periodStart), dayjs(invoice.periodEnd)]);
  useEffect(() => {
    setName(invoice.invoiceName ?? '');
    setPeriod([dayjs(invoice.periodStart), dayjs(invoice.periodEnd)]);
  }, [invoice.invoiceName, invoice.periodStart, invoice.periodEnd]);

  const dirty =
    name !== (invoice.invoiceName ?? '') ||
    period[0].format('YYYY-MM-DD') !== invoice.periodStart ||
    period[1].format('YYYY-MM-DD') !== invoice.periodEnd;

  const save = useMutation({
    mutationFn: () =>
      updateConsolidatedDetails(invoice.id, {
        invoiceName: name.trim() || null,
        periodStart: period[0].format('YYYY-MM-DD'),
        periodEnd: period[1].format('YYYY-MM-DD'),
      }),
    onSuccess: () => {
      message.success('Saved');
      onSaved();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Save failed'),
  });

  return (
    <Row gutter={[16, 12]} align="bottom">
      <Col xs={24} md={10}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Invoice name
        </Typography.Text>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Auto-named if left blank" />
      </Col>
      <Col xs={24} md={10}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Period
        </Typography.Text>
        <DatePicker.RangePicker
          style={{ width: '100%' }}
          value={period}
          onChange={(v) => v && v[0] && v[1] && setPeriod([v[0], v[1]])}
        />
      </Col>
      <Col xs={24} md={4}>
        <Button block type="primary" disabled={!dirty} loading={save.isPending} onClick={() => save.mutate()}>
          Save
        </Button>
      </Col>
    </Row>
  );
}

export default function ConsolidatedInvoiceReview() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const consolidatedInvoiceId = Number(id);
  const queryClient = useQueryClient();
  const { jobs, startJob, dismiss } = useUpload();
  const [addTab, setAddTab] = useState(params.get('add') === 'upload' ? 'upload' : 'manual');
  const [pickedIds, setPickedIds] = useState<number[]>([]);

  const { data: invoice, isLoading } = useQuery({
    queryKey: ['consolidated-invoice', consolidatedInvoiceId],
    queryFn: () => getConsolidatedInvoice(consolidatedInvoiceId),
  });

  const isDraft = invoice?.status === 'DRAFT';

  const { data: pool, isLoading: poolLoading } = useQuery({
    queryKey: ['eligible-transactions'],
    queryFn: listEligibleTransactions,
    enabled: isDraft,
  });

  const { data: submissions } = useQuery({
    queryKey: ['consolidated-submissions', consolidatedInvoiceId],
    queryFn: () => listConsolidatedSubmissions(consolidatedInvoiceId),
    enabled: invoice?.status === 'SUBMITTED' || invoice?.status === 'ACCEPTED' || invoice?.status === 'REJECTED',
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['consolidated-invoice', consolidatedInvoiceId] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-submissions', consolidatedInvoiceId] });
    queryClient.invalidateQueries({ queryKey: ['consolidated-invoices'] });
    queryClient.invalidateQueries({ queryKey: ['eligible-transactions'] });
  };

  const onErr = (fallback: string) => (err: unknown) => message.error(err instanceof Error ? err.message : fallback);

  const confirmMutation = useMutation({
    mutationFn: () => confirmConsolidatedInvoice(consolidatedInvoiceId),
    onSuccess: () => {
      message.success('Consolidated invoice confirmed — ready to submit');
      invalidate();
    },
    onError: onErr('Confirm failed'),
  });

  const submitMutation = useMutation({
    mutationFn: () => submitConsolidatedInvoice(consolidatedInvoiceId),
    onSuccess: () => {
      message.success('Submitted to MyInvois');
      invalidate();
    },
    onError: onErr('Submission failed'),
  });

  const refreshMutation = useMutation({
    mutationFn: (submissionId: number) => refreshSubmission(submissionId),
    onSuccess: () => {
      message.success('Status refreshed');
      invalidate();
    },
    onError: onErr('Refresh failed'),
  });

  const addLines = useMutation({
    mutationFn: (lines: Parameters<typeof addConsolidatedLines>[1]) =>
      queueAttach(() => addConsolidatedLines(consolidatedInvoiceId, lines)),
    onSuccess: () => {
      message.success('Sales added');
      invalidate();
    },
    onError: onErr('Could not add sales'),
  });

  const attachPicked = useMutation({
    mutationFn: () => queueAttach(() => attachTransactions(consolidatedInvoiceId, pickedIds)),
    onSuccess: () => {
      message.success('Sales added');
      setPickedIds([]);
      invalidate();
    },
    onError: onErr('Could not add sales'),
  });

  const removeTx = useMutation({
    mutationFn: (txId: number) => queueAttach(() => removeConsolidatedTransaction(consolidatedInvoiceId, txId)),
    onSuccess: invalidate,
    onError: onErr('Could not remove'),
  });

  const fitPeriod = useMutation({
    mutationFn: () => {
      const dates = (invoice?.transactions ?? []).map((t) => t.transactionDate).filter((d): d is string => !!d).sort();
      return updateConsolidatedDetails(consolidatedInvoiceId, {
        invoiceName: invoice?.invoiceName,
        periodStart: dates[0],
        periodEnd: dates[dates.length - 1],
      });
    },
    onSuccess: invalidate,
    onError: onErr('Could not adjust the period'),
  });

  // Each file extracts in the background and is attached to THIS draft when ready.
  const uploadFile = (file: File) => {
    startJob({
      kind: 'consolidated',
      label: `Extracting ${file.name}`,
      draftId: consolidatedInvoiceId,
      run: async () => {
        const doc = await uploadDocument(file);
        const txs = await extractTransactions(doc.id);
        if (txs.length > 0) {
          await queueAttach(() => attachTransactions(consolidatedInvoiceId, txs.map((t) => t.id)));
        }
        queryClient.invalidateQueries({ queryKey: ['consolidated-invoice', consolidatedInvoiceId] });
        return { link: { to: `/consolidated-invoices/${consolidatedInvoiceId}`, text: 'View draft' } };
      },
    });
  };

  if (isLoading || !invoice) {
    return <Typography.Text>Loading...</Typography.Text>;
  }

  const draftJobs = jobs.filter((j) => j.draftId === consolidatedInvoiceId);
  const running = draftJobs.filter((j) => j.status === 'running');
  const failed = draftJobs.filter((j) => j.status === 'error');
  const outside = invoice.transactions.filter((t) => outsidePeriod(t, invoice));
  const hasTx = invoice.transactions.length > 0;
  const step = invoice.status === 'DRAFT' ? (hasTx ? 2 : 1) : 3;
  const title = invoiceDisplayName(invoice.invoiceName, invoice.id, invoice.createdAt ?? invoice.periodStart);

  const columns = [
    {
      title: 'Date',
      dataIndex: 'transactionDate',
      key: 'transactionDate',
      width: 130,
      render: (v: string | null, record: SalesTransactionResponse) => (
        <Space size={4} wrap>
          {v ?? '—'}
          {outsidePeriod(record, invoice) && <Tag color="warning">Outside period</Tag>}
        </Space>
      ),
    },
    { title: 'Description', dataIndex: 'description', key: 'description' },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 70 },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 100 },
    { title: 'Tax', dataIndex: 'taxAmount', key: 'taxAmount', width: 90 },
    { title: 'Unit', dataIndex: 'unitCode', key: 'unitCode', width: 70, render: (v: string | null) => v ?? '—' },
    {
      title: 'Buyer',
      key: 'buyer',
      render: (_: unknown, record: SalesTransactionResponse) =>
        record.buyerName || record.buyerTin ? (
          <Tag color="warning">{`${record.buyerName ?? ''} ${record.buyerTin ?? ''}`.trim()}</Tag>
        ) : (
          '—'
        ),
    },
    ...(isDraft
      ? [
          {
            title: '',
            key: 'remove',
            width: 90,
            render: (_: unknown, record: SalesTransactionResponse) => (
              <Button size="small" danger type="link" loading={removeTx.isPending && removeTx.variables === record.id} onClick={() => removeTx.mutate(record.id)}>
                Remove
              </Button>
            ),
          },
        ]
      : []),
  ];

  return (
    <Page
      title={title}
      tag={<StatusTag status={invoice.status} />}
      extra={
        <>
            {invoice.status === 'DRAFT' && (
              <Button
                type="primary"
                disabled={!hasTx}
                onClick={() => confirmMutation.mutate()}
                loading={confirmMutation.isPending}
              >
                Confirm
              </Button>
            )}
            {invoice.status === 'CONFIRMED' && (
              <Button type="primary" onClick={() => submitMutation.mutate()} loading={submitMutation.isPending}>
                Submit to MyInvois
              </Button>
            )}
        </>
      }
    >
      <ConsolidatedSteps current={step} />

      <Card title="Invoice details">
        {isDraft ? (
          <DetailsEditor invoice={invoice} onSaved={invalidate} />
        ) : (
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
        )}
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
      </Card>

      {(invoice.status === 'DRAFT' || invoice.status === 'CONFIRMED') && <DueByHint periodEnd={invoice.periodEnd} />}

      {running.map((j) => (
        <Alert key={j.id} type="info" showIcon icon={<LoadingOutlined />} message={j.label} description="Extracting sales — they’ll appear below automatically. You can keep adding files or browse elsewhere." />
      ))}
      {failed.map((j) => (
        <Alert key={j.id} type="error" showIcon closable onClose={() => dismiss(j.id)} message={`${j.label} failed`} description={j.error} />
      ))}
      {outside.length > 0 && isDraft && (
        <Alert
          type="warning"
          showIcon
          message={`${outside.length} sale${outside.length === 1 ? ' is' : 's are'} dated outside ${invoice.periodStart} – ${invoice.periodEnd}`}
          description="Remove them, or widen the period to cover every sale."
          action={
            <Button size="small" loading={fitPeriod.isPending} onClick={() => fitPeriod.mutate()}>
              Adjust period to fit
            </Button>
          }
        />
      )}

      {isDraft && (
        <Card title="Add sales">
          <Tabs
            activeKey={addTab}
            onChange={setAddTab}
            items={[
              {
                key: 'manual',
                label: 'Key in',
                children: (
                  <ManualSalesForm
                    periodEnd={invoice.periodEnd}
                    submitText="Add to invoice"
                    loading={addLines.isPending}
                    onSubmit={(lines) => addLines.mutate(lines)}
                  />
                ),
              },
              {
                key: 'upload',
                label: 'Upload files',
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      Pick several files at once, or come back and add more later. AI extracts the sales and adds them to
                      this invoice — remove any that don’t belong.
                    </Typography.Paragraph>
                    <FileUploadDropzone
                      multiple
                      uploading={false}
                      hint="Supports .xlsx, .pdf, .png, .jpg"
                      onFileSelected={uploadFile}
                    />
                  </Space>
                ),
              },
              {
                key: 'pool',
                label: `Earlier extractions${pool && pool.length ? ` (${pool.length})` : ''}`,
                children: (
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                      Sales extracted earlier that aren’t in any invoice yet. Tick the ones to add here.
                    </Typography.Paragraph>
                    <TransactionSelectionTable
                      transactions={pool ?? []}
                      selectedIds={pickedIds}
                      onSelectionChange={setPickedIds}
                      loading={poolLoading}
                    />
                    <Button
                      type="primary"
                      disabled={pickedIds.length === 0}
                      loading={attachPicked.isPending}
                      onClick={() => attachPicked.mutate()}
                    >
                      Add {pickedIds.length || ''} selected
                    </Button>
                  </Space>
                ),
              },
            ]}
          />
        </Card>
      )}

      <Card title={`Sales in this invoice (${invoice.transactions.length})`}>
        {hasTx ? (
          <Table
            rowKey="id"
            dataSource={invoice.transactions}
            columns={columns}
            pagination={tablePagination(invoice.transactions.length)}
            size="small"
            scroll={{ x: 'max-content' }}
          />
        ) : (
          <Typography.Text type="secondary">
            No sales yet — key some in or upload files above. You can confirm once there’s at least one.
          </Typography.Text>
        )}
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
    </Page>
  );
}
