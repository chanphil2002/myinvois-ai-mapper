import { useState } from 'react';
import { Button, Card, Col, DatePicker, Input, InputNumber, Row, Space, Table, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import FileUploadDropzone from '../../components/FileUploadDropzone';
import { createManualConsolidatedInvoice, extractTransactions, uploadDocument } from '../../api/endpoints';
import type { ManualConsolidatedLineItem } from '../../api/types';

type Method = null | 'manual' | 'upload';

interface Row {
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
}

const emptyRow = (): Row => ({ description: '', quantity: 1, unitPrice: 0, taxAmount: 0 });

export default function CreateConsolidated() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>(null);
  const [period, setPeriod] = useState<[Dayjs, Dayjs] | null>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  const manualMutation = useMutation({
    mutationFn: () => {
      if (!period) throw new Error('Select a period');
      const lineItems: ManualConsolidatedLineItem[] = rows
        .filter((r) => r.description.trim() !== '')
        .map((r) => ({ description: r.description, quantity: r.quantity, unitPrice: r.unitPrice, taxAmount: r.taxAmount }));
      if (lineItems.length === 0) throw new Error('Add at least one line item');
      return createManualConsolidatedInvoice({
        periodStart: period[0].format('YYYY-MM-DD'),
        periodEnd: period[1].format('YYYY-MM-DD'),
        lineItems,
      });
    },
    onSuccess: (invoice) => {
      message.success('Consolidated invoice created — review and submit');
      navigate(`/consolidated-invoices/${invoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not create consolidated invoice'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const doc = await uploadDocument(file);
      return extractTransactions(doc.id);
    },
    onSuccess: (transactions) => {
      message.success(`Extracted ${transactions.length} transaction(s) — select and group them`);
      navigate('/consolidate');
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Transaction extraction failed'),
  });

  const updateRow = (index: number, field: keyof Row, value: unknown) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  if (method === null) {
    return (
      <div style={{ maxWidth: 820 }}>
        <Typography.Title level={3}>Consolidated e-Invoice</Typography.Title>
        <Typography.Paragraph type="secondary">How do you want to enter the sales?</Typography.Paragraph>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card hoverable onClick={() => setMethod('manual')} style={{ height: '100%' }}>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Key in manually
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Enter the period and each B2C sale line yourself.
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card hoverable onClick={() => setMethod('upload')} style={{ height: '100%' }}>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Upload a document
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Upload a file; AI extracts the sale lines for you to group.
              </Typography.Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  if (method === 'upload') {
    return (
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 820 }}>
        <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setMethod(null)}>
          ← Back
        </Button>
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Upload a source document
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            AI extracts individual B2C sales; you then select and group them into one consolidated invoice.
          </Typography.Paragraph>
          <FileUploadDropzone uploading={uploadMutation.isPending} onFileSelected={(file) => uploadMutation.mutate(file)} />
        </Card>
      </Space>
    );
  }

  const columns = [
    {
      title: 'Description',
      key: 'description',
      render: (_: unknown, _r: Row, i: number) => (
        <Input value={rows[i].description} onChange={(e) => updateRow(i, 'description', e.target.value)} />
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 110,
      render: (_: unknown, _r: Row, i: number) => (
        <InputNumber style={{ width: '100%' }} value={rows[i].quantity} min={0} onChange={(v) => updateRow(i, 'quantity', v ?? 0)} />
      ),
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      width: 130,
      render: (_: unknown, _r: Row, i: number) => (
        <InputNumber style={{ width: '100%' }} value={rows[i].unitPrice} min={0} onChange={(v) => updateRow(i, 'unitPrice', v ?? 0)} />
      ),
    },
    {
      title: 'Tax',
      key: 'taxAmount',
      width: 120,
      render: (_: unknown, _r: Row, i: number) => (
        <InputNumber style={{ width: '100%' }} value={rows[i].taxAmount} min={0} onChange={(v) => updateRow(i, 'taxAmount', v ?? 0)} />
      ),
    },
    {
      title: '',
      key: 'remove',
      width: 80,
      render: (_: unknown, _r: Row, i: number) => (
        <Button danger size="small" disabled={rows.length === 1} onClick={() => setRows(rows.filter((_, j) => j !== i))}>
          Remove
        </Button>
      ),
    },
  ];

  const total = rows.reduce((sum, r) => sum + r.quantity * r.unitPrice + r.taxAmount, 0);

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Button type="link" style={{ paddingLeft: 0 }} onClick={() => setMethod(null)}>
        ← Back
      </Button>
      <Card title="Key in a consolidated e-Invoice">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Text type="secondary">Aggregation period</Typography.Text>
            <br />
            <DatePicker.RangePicker
              value={period}
              onChange={(v) => setPeriod(v as [Dayjs, Dayjs] | null)}
              style={{ marginTop: 4 }}
            />
          </div>
          <Table rowKey={(_, i) => String(i)} dataSource={rows} columns={columns} pagination={false} size="small" scroll={{ x: 'max-content' }} />
          <Button type="dashed" block onClick={() => setRows([...rows, emptyRow()])}>
            + Add line item
          </Button>
          <Typography.Text strong>Grand total: RM {total.toFixed(2)}</Typography.Text>
          <div>
            <Button type="primary" loading={manualMutation.isPending} onClick={() => manualMutation.mutate()}>
              Create consolidated invoice
            </Button>
          </div>
        </Space>
      </Card>
    </Space>
  );
}
