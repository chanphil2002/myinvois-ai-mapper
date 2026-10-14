import { useState } from 'react';
import { Alert, Button, Col, DatePicker, Input, InputNumber, Modal, Row, Select, Space, Typography, Upload, message, theme } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ManualConsolidatedLineItem } from '../api/types';
import { CLASSIFICATION_CODES, UOM_CODES } from '../constants/myinvoisCodes';
import { parseSalesText } from '../utils/salesCsv';
import type { ParseResult } from '../utils/salesCsv';

interface Line {
  date: Dayjs | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
  unitCode: string | null;
  classificationCode: string | null;
}

const blank = (date: Dayjs | null): Line => ({
  date,
  description: '',
  quantity: 1,
  unitPrice: 0,
  taxAmount: 0,
  unitCode: null,
  classificationCode: null,
});
const touched = (l: Line) =>
  l.description.trim() !== '' || l.unitPrice !== 0 || l.taxAmount !== 0 || l.quantity !== 1 || !!l.unitCode || !!l.classificationCode;

interface Props {
  /** Period bounds; default date for new lines is the period end. */
  periodEnd: string;
  submitText: string;
  loading?: boolean;
  onSubmit: (lines: ManualConsolidatedLineItem[]) => void;
}

/** Card-per-sale entry form (works on phones, no horizontal scroll) with inline validation. */
export default function ManualSalesForm({ periodEnd, submitText, loading, onSubmit }: Props) {
  const { token } = theme.useToken();
  const defaultDate = dayjs(periodEnd);
  const [lines, setLines] = useState<Line[]>([blank(defaultDate)]);
  const [showErrors, setShowErrors] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [parsed, setParsed] = useState<ParseResult | null>(null);

  const update = (i: number, patch: Partial<Line>) => setLines(lines.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const remove = (i: number) => setLines(lines.length === 1 ? [blank(defaultDate)] : lines.filter((_, j) => j !== i));

  const invalid = (l: Line) => touched(l) && l.description.trim() === '';
  const filled = lines.filter((l) => l.description.trim() !== '');
  const total = filled.reduce((sum, l) => sum + l.quantity * l.unitPrice + l.taxAmount, 0);

  const submit = () => {
    setShowErrors(true);
    if (lines.some(invalid) || filled.length === 0) return;
    onSubmit(
      filled.map((l) => ({
        transactionDate: l.date ? l.date.format('YYYY-MM-DD') : null,
        description: l.description.trim(),
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        taxAmount: l.taxAmount,
        unitCode: l.unitCode,
        classificationCode: l.classificationCode,
      })),
    );
    setLines([blank(defaultDate)]);
    setShowErrors(false);
  };

  const closeImport = () => {
    setImportOpen(false);
    setCsvText('');
    setParsed(null);
  };

  const applyImport = () => {
    if (!parsed || parsed.sales.length === 0) return;
    const added: Line[] = parsed.sales.map((x) => ({
      date: x.date ? dayjs(x.date) : defaultDate,
      description: x.description,
      quantity: x.quantity,
      unitPrice: x.unitPrice,
      taxAmount: x.taxAmount,
      unitCode: x.unitCode,
      classificationCode: x.classificationCode,
    }));
    // Replace the untouched starter row instead of leaving an empty card above the imported ones.
    setLines([...lines.filter(touched), ...added]);
    if (added.some((a) => a.unitCode || a.classificationCode)) setShowMore(true);
    message.success(`${added.length} sale${added.length === 1 ? '' : 's'} imported — review, then add to invoice`);
    closeImport();
  };

  const label = (text: string) => (
    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
      {text}
    </Typography.Text>
  );

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {lines.map((l, i) => {
        const bad = showErrors && invalid(l);
        return (
          <div
            key={i}
            style={{ border: `1px solid ${token.colorBorderSecondary}`, borderRadius: 10, padding: 14 }}
          >
            <Row gutter={[12, 10]}>
              <Col xs={24} md={14}>
                {label('Description')}
                <Input
                  status={bad ? 'error' : undefined}
                  value={l.description}
                  placeholder="e.g. Walk-in sales — 12 Sep"
                  onChange={(e) => update(i, { description: e.target.value })}
                />
                {bad && <Typography.Text type="danger" style={{ fontSize: 12 }}>Add a description for this sale.</Typography.Text>}
              </Col>
              <Col xs={24} md={10}>
                {label('Sale date')}
                <DatePicker style={{ width: '100%' }} value={l.date} onChange={(d) => update(i, { date: d })} />
              </Col>
              <Col xs={8}>
                {label('Qty')}
                <InputNumber style={{ width: '100%' }} min={0} value={l.quantity} onChange={(v) => update(i, { quantity: v ?? 0 })} />
              </Col>
              <Col xs={8}>
                {label('Unit price')}
                <InputNumber style={{ width: '100%' }} min={0} value={l.unitPrice} onChange={(v) => update(i, { unitPrice: v ?? 0 })} />
              </Col>
              <Col xs={8}>
                {label('Tax')}
                <InputNumber style={{ width: '100%' }} min={0} value={l.taxAmount} onChange={(v) => update(i, { taxAmount: v ?? 0 })} />
              </Col>
              {showMore && (
                <>
                  <Col xs={24} md={10}>
                    {label('Unit of measurement')}
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      style={{ width: '100%' }}
                      placeholder="Default: C62 (unit)"
                      options={UOM_CODES}
                      value={l.unitCode ?? undefined}
                      onChange={(v) => update(i, { unitCode: v ?? null })}
                    />
                  </Col>
                  <Col xs={24} md={14}>
                    {label('Classification (for your records)')}
                    <Select
                      allowClear
                      showSearch
                      optionFilterProp="label"
                      style={{ width: '100%' }}
                      placeholder="Submitted as 004"
                      options={CLASSIFICATION_CODES}
                      value={l.classificationCode ?? undefined}
                      onChange={(v) => update(i, { classificationCode: v ?? null })}
                    />
                  </Col>
                </>
              )}
            </Row>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Button type="link" danger size="small" onClick={() => remove(i)} style={{ padding: 0 }}>
                {lines.length === 1 ? 'Clear' : 'Remove'}
              </Button>
            </div>
          </div>
        );
      })}
      <Space wrap>
        <Button type="dashed" onClick={() => setLines([...lines, blank(defaultDate)])}>
          + Add another sale
        </Button>
        <Button onClick={() => setImportOpen(true)}>Paste / import CSV</Button>
        <Button type="link" onClick={() => setShowMore(!showMore)}>
          {showMore ? 'Hide' : 'Show'} unit &amp; classification
        </Button>
      </Space>
      {showMore && (
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Unit of measurement is submitted to MyInvois. MyInvois requires classification 004 on every consolidated
          line, so a code you pick here is kept for your records only.
        </Typography.Text>
      )}
      <Modal
        open={importOpen}
        title="Paste or import sales"
        onCancel={closeImport}
        onOk={applyImport}
        okText={parsed ? `Import ${parsed.sales.length} sale${parsed.sales.length === 1 ? '' : 's'}` : 'Import'}
        okButtonProps={{ disabled: !parsed || parsed.sales.length === 0 }}
        width={680}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            Paste rows copied from Excel/Sheets or a CSV file. Columns: <strong>date, description, qty, unit price, tax</strong>
            , then optional <strong>unit</strong> and <strong>classification</strong>. A header row is optional (columns are
            matched by name when present). Dates: YYYY-MM-DD or DD/MM/YYYY.
          </Typography.Paragraph>
          <Upload
            accept=".csv,.txt,.tsv"
            showUploadList={false}
            beforeUpload={(file) => {
              file.text().then((t) => {
                setCsvText(t);
                setParsed(parseSalesText(t));
              });
              return false;
            }}
          >
            <Button>Choose a CSV file…</Button>
          </Upload>
          <Input.TextArea
            rows={7}
            value={csvText}
            placeholder={'2026-09-05,Walk-in sales,3,12.50,0\n2026-09-06,Online orders,1,80.00,4.80,C62'}
            onChange={(e) => {
              setCsvText(e.target.value);
              setParsed(e.target.value.trim() ? parseSalesText(e.target.value) : null);
            }}
          />
          {parsed && parsed.sales.length > 0 && (
            <Alert type="success" showIcon message={`${parsed.sales.length} sale${parsed.sales.length === 1 ? '' : 's'} ready to import`} />
          )}
          {parsed && parsed.warnings.length > 0 && (
            <Alert
              type="warning"
              showIcon
              message={`${parsed.warnings.length} note${parsed.warnings.length === 1 ? '' : 's'}`}
              description={
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {parsed.warnings.slice(0, 8).map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                  {parsed.warnings.length > 8 && <li>…and {parsed.warnings.length - 8} more</li>}
                </ul>
              }
            />
          )}
        </Space>
      </Modal>
      {showErrors && filled.length === 0 && (
        <Typography.Text type="danger">Enter at least one sale with a description.</Typography.Text>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <Typography.Text strong>Total: RM {total.toFixed(2)}</Typography.Text>
        <Button type="primary" loading={loading} onClick={submit}>
          {submitText}
        </Button>
      </div>
    </Space>
  );
}
