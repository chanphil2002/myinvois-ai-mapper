import { Table, InputNumber, Input, Button, Select, Space } from 'antd';
import type { LineItem } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { CLASSIFICATION_CODES, UOM_CODES } from '../constants/myinvoisCodes';
import type { CodeOption } from '../constants/myinvoisCodes';

interface Props {
  lineItems: LineItem[];
  onChange: (lineItems: LineItem[]) => void;
  disabled: boolean;
}

// Always show the current value even if it isn't one of the known codes (e.g. an unusual AI result).
function optionsWith(base: CodeOption[], value: string | null | undefined): CodeOption[] {
  if (value && !base.some((o) => o.value === value)) return [{ value, label: value }, ...base];
  return base;
}

// Confidence tints that stay readable in both themes (light pastels vs. low-alpha overlays).
function confidenceColor(score: number | null, isDark: boolean): string | undefined {
  if (score === null) return undefined;
  if (score >= 0.8) return isDark ? 'rgba(82,196,26,0.20)' : '#f6ffed';
  if (score >= 0.5) return isDark ? 'rgba(250,173,20,0.22)' : '#fffbe6';
  return isDark ? 'rgba(255,77,79,0.24)' : '#fff1f0';
}

export default function MappingReviewTable({ lineItems, onChange, disabled }: Props) {
  const { isDark } = useTheme();
  const updateField = (index: number, field: keyof LineItem, value: unknown) => {
    const next = lineItems.map((item, i) => (i === index ? { ...item, [field]: value } : item));
    onChange(next);
  };

  const removeRow = (index: number) => {
    onChange(lineItems.filter((_, i) => i !== index));
  };

  const addRow = () => {
    const nextLineNo = lineItems.reduce((max, li) => Math.max(max, li.lineNo), 0) + 1;
    // No id => the backend treats this as a brand-new line (see InvoiceReviewService.applyRequest).
    onChange([
      ...lineItems,
      {
        id: undefined as unknown as number,
        lineNo: nextLineNo,
        description: '',
        quantity: 1,
        unitPrice: 0,
        taxAmount: 0,
        classificationCode: '022',
        unitCode: 'C62',
        confidenceScore: null,
      },
    ]);
  };

  const columns = [
    {
      title: 'Description',
      key: 'description',
      render: (_: unknown, record: LineItem, index: number) => (
        <Input
          value={record.description ?? ''}
          disabled={disabled}
          style={{ background: confidenceColor(record.confidenceScore, isDark) }}
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
      width: 260,
      render: (_: unknown, record: LineItem, index: number) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Select classification"
          disabled={disabled}
          value={record.classificationCode || undefined}
          options={optionsWith(CLASSIFICATION_CODES, record.classificationCode)}
          optionFilterProp="label"
          onChange={(v) => updateField(index, 'classificationCode', v)}
        />
      ),
    },
    {
      title: 'Unit (UOM)',
      key: 'unitCode',
      width: 180,
      render: (_: unknown, record: LineItem, index: number) => (
        <Select
          showSearch
          style={{ width: '100%' }}
          placeholder="Unit"
          disabled={disabled}
          value={record.unitCode || undefined}
          options={optionsWith(UOM_CODES, record.unitCode)}
          optionFilterProp="label"
          onChange={(v) => updateField(index, 'unitCode', v)}
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

  return (
    <Space direction="vertical" style={{ width: '100%' }}>
      <Table
        rowKey="lineNo"
        dataSource={lineItems}
        columns={columns}
        pagination={false}
        size="small"
        scroll={{ x: 'max-content' }}
      />
      {!disabled && (
        <Button type="dashed" block onClick={addRow}>
          + Add line item
        </Button>
      )}
    </Space>
  );
}
