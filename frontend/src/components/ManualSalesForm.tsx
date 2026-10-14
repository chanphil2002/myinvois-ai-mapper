import { useState } from 'react';
import { Button, Col, DatePicker, Input, InputNumber, Row, Space, Typography, theme } from 'antd';
import dayjs, { Dayjs } from 'dayjs';
import type { ManualConsolidatedLineItem } from '../api/types';

interface Line {
  date: Dayjs | null;
  description: string;
  quantity: number;
  unitPrice: number;
  taxAmount: number;
}

const blank = (date: Dayjs | null): Line => ({ date, description: '', quantity: 1, unitPrice: 0, taxAmount: 0 });
const touched = (l: Line) => l.description.trim() !== '' || l.unitPrice !== 0 || l.taxAmount !== 0 || l.quantity !== 1;

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
      })),
    );
    setLines([blank(defaultDate)]);
    setShowErrors(false);
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
            </Row>
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Button type="link" danger size="small" onClick={() => remove(i)} style={{ padding: 0 }}>
                {lines.length === 1 ? 'Clear' : 'Remove'}
              </Button>
            </div>
          </div>
        );
      })}
      <Button type="dashed" block onClick={() => setLines([...lines, blank(defaultDate)])}>
        + Add another sale
      </Button>
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
