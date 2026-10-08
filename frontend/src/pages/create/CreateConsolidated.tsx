import { useRef, useState } from 'react';
import { Button, Card, Col, DatePicker, Input, InputNumber, List, Row, Space, Spin, Table, Typography, message } from 'antd';
import { CheckCircleTwoTone, CloseCircleTwoTone, LoadingOutlined } from '@ant-design/icons';
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

interface Upload {
  id: number;
  name: string;
  status: 'uploading' | 'done' | 'error';
  count?: number;
  error?: string;
}

const emptyRow = (): Row => ({ description: '', quantity: 1, unitPrice: 0, taxAmount: 0 });

export default function CreateConsolidated() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>(null);
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<[Dayjs, Dayjs] | null>([dayjs().startOf('month'), dayjs().endOf('month')]);
  const [rows, setRows] = useState<Row[]>([emptyRow()]);

  // Batch upload state — files extract independently and accumulate on the server, so the user
  // can add several at once, or upload some now and come back to add more later.
  const [uploads, setUploads] = useState<Upload[]>([]);
  const uidRef = useRef(0);

  const processFile = async (file: File) => {
    const id = ++uidRef.current;
    setUploads((u) => [...u, { id, name: file.name, status: 'uploading' }]);
    try {
      const doc = await uploadDocument(file);
      const txns = await extractTransactions(doc.id);
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: 'done', count: txns.length } : x)));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed';
      setUploads((u) => u.map((x) => (x.id === id ? { ...x, status: 'error', error: msg } : x)));
      message.error(`${file.name}: ${msg}`);
    }
  };

  const anyUploading = uploads.some((u) => u.status === 'uploading');
  const extractedCount = uploads.filter((u) => u.status === 'done').reduce((s, u) => s + (u.count ?? 0), 0);

  const manualMutation = useMutation({
    mutationFn: () => {
      if (!period) throw new Error('Select a period');
      const lineItems: ManualConsolidatedLineItem[] = rows
        .filter((r) => r.description.trim() !== '')
        .map((r) => ({ description: r.description, quantity: r.quantity, unitPrice: r.unitPrice, taxAmount: r.taxAmount }));
      if (lineItems.length === 0) throw new Error('Add at least one line item');
      return createManualConsolidatedInvoice({
        invoiceName: name.trim() || null,
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

  const updateRow = (index: number, field: keyof Row, value: unknown) =>
    setRows(rows.map((r, i) => (i === index ? { ...r, [field]: value } : r)));

  // A single Back that steps up one level (method screen → chooser → type picker).
  const back = (
    <Button
      type="link"
      style={{ paddingLeft: 0 }}
      onClick={() => (method === null ? navigate('/create') : setMethod(null))}
    >
      ← Back
    </Button>
  );

  if (method === null) {
    return (
      <div style={{ maxWidth: 820 }}>
        {back}
        <Typography.Title level={3} style={{ marginTop: 8 }}>
          Consolidated e-Invoice
        </Typography.Title>
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
                Upload documents
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Upload one or more files; AI extracts the sale lines for you to group.
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
        {back}
        <Card title="Upload source documents">
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
              Add one or more files — all at once, or upload some now and add more later. AI extracts the B2C
              sales from each; nothing is lost between uploads. When you're ready, continue to group and submit them.
            </Typography.Paragraph>

            <FileUploadDropzone
              multiple
              uploading={anyUploading}
              hint="Supports .xlsx, .pdf, .png, .jpg — add several at once"
              onFileSelected={processFile}
            />

            {uploads.length > 0 && (
              <List
                size="small"
                bordered
                dataSource={uploads}
                renderItem={(u) => (
                  <List.Item>
                    <Space>
                      {u.status === 'uploading' && <Spin indicator={<LoadingOutlined spin />} size="small" />}
                      {u.status === 'done' && <CheckCircleTwoTone twoToneColor="#16a34a" />}
                      {u.status === 'error' && <CloseCircleTwoTone twoToneColor="#dc2626" />}
                      <span>{u.name}</span>
                    </Space>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {u.status === 'uploading' && 'Extracting…'}
                      {u.status === 'done' && `${u.count} transaction${u.count === 1 ? '' : 's'}`}
                      {u.status === 'error' && u.error}
                    </Typography.Text>
                  </List.Item>
                )}
              />
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Button
                type="primary"
                disabled={extractedCount === 0 || anyUploading}
                loading={anyUploading}
                onClick={() => navigate('/consolidate')}
              >
                Continue to grouping →
              </Button>
              {extractedCount > 0 && (
                <Typography.Text type="secondary">
                  {extractedCount} transaction{extractedCount === 1 ? '' : 's'} extracted so far
                </Typography.Text>
              )}
            </div>
          </Space>
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
      {back}
      <Card title="Key in a consolidated e-Invoice">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ maxWidth: 360 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Invoice name (optional)
            </Typography.Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. September B2C consolidated"
              style={{ marginTop: 4 }}
            />
          </div>
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
