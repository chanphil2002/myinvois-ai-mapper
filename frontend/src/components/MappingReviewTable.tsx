import { Table, InputNumber, Input, Button } from 'antd';
import type { LineItem } from '../api/types';

interface Props {
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  disabled: boolean;
}

function confidenceColor(score: number | null): string | undefined {
  if (score === null) return undefined;
  if (score >= 0.8) return '#f6ffed';
  if (score >= 0.5) return '#fffbe6';
  return '#fff1f0';
}

export default function MappingReviewTable({ lineItems, onChange, disabled }: Props) {
  const updateField = (index: number, field: keyof LineItem, value: unknown) => {
    const next = lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const columns = [
    {
      title: 'Description',
      key: 'description',
      render: (_: unknown, record: LineItem, index: number) => (
        <Input
          value={record.description ?? ''}
          disabled={disabled}
          style={{ background: confidenceColor(record.confidenceScore) }}
          onChange={(e) => updateField(index, 'description', e.target.value)}
        />
      ),
    },
    {
      title: 'Qty',
      key: 'quantity',
      width: 100,
      render: (_: unknown, record: LineItem, index: number) => (
        <InputNumber
          value={record.quantity}
          disabled={disabled}
          onChange={(v) => updateField(index, 'quantity', v ?? 0)}
        />
      ),
    },
    {
      title: 'Unit Price',
      key: 'unitPrice',
      width: 120,
      render: (_: unknown, record: LineItem, index: number) => (
        <InputNumber
          value={record.unitPrice}
          disabled={disabled}
          onChange={(v) => updateField(index, 'unitPrice', v ?? 0)}
        />
      ),
    },
    {
      title: 'Tax Amount',
      key: 'taxAmount',
      width: 120,
      render: (_: unknown, record: LineItem, index: number) => (
        <InputNumber
          value={record.taxAmount}
          disabled={disabled}
          onChange={(v) => updateField(index, 'taxAmount', v ?? 0)}
        />
      ),
    },
    {
      title: 'Classification Code',
      key: 'classificationCode',
      width: 160,
      render: (_: unknown, record: LineItem, index: number) => (
        <Input
          value={record.classificationCode ?? ''}
          disabled={disabled}
          onChange={(e) => updateField(index, 'classificationCode', e.target.value)}
        />
      ),
    },
    ...(disabled
      ? []
      : [
          {
            title: '',
            key: 'remove',
            width: 60,
            render: (_: unknown, __: LineItem, index: number) => (
              <Button danger size="small" onClick={() => removeRow(index)}>
                Remove
              </Button>
            ),
          },
        ]),
  ];

  return <Table rowKey="lineNo" dataSource={lineItems} columns={columns} pagination={false} size="small" />;
}
