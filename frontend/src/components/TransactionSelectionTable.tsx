import { Table, Tag } from 'antd';
import type { SalesTransactionResponse } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import { confidenceTint } from '../theme/palette';

interface Props {
  transactions: SalesTransactionResponse[];
  selectedIds: number[];
  onSelectionChange: (ids: number[]) => void;
  loading?: boolean;
}

/**
 * Sibling to MappingReviewTable, but for picking (not editing) transactions: a plain selectable
 * grid rather than a controlled-array editor. `eligibleForConsolidation` only pre-tints rows and
 * is never a hard filter — the user can select or deselect any row regardless of the AI's guess.
 */
export default function TransactionSelectionTable({ transactions, selectedIds, onSelectionChange, loading }: Props) {
  const { palette } = useTheme();
  const columns = [
    { title: 'Date', dataIndex: 'transactionDate', key: 'transactionDate', width: 110 },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (value: string | null, record: SalesTransactionResponse) => (
        <span style={{ background: confidenceTint(record.confidenceScore, palette), padding: '2px 4px', borderRadius: 4 }}>{value}</span>
      ),
    },
    { title: 'Qty', dataIndex: 'quantity', key: 'quantity', width: 80 },
    { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', width: 100 },
    { title: 'Tax Amount', dataIndex: 'taxAmount', key: 'taxAmount', width: 100 },
    {
      title: 'Buyer',
      key: 'buyer',
      render: (_: unknown, record: SalesTransactionResponse) =>
        record.buyerName || record.buyerTin ? (
          <span>
            {record.buyerName} {record.buyerTin && `(${record.buyerTin})`}
          </span>
        ) : (
          <Tag>Anonymous / walk-in</Tag>
        ),
    },
    {
      title: 'Eligible',
      key: 'eligibleForConsolidation',
      width: 90,
      render: (_: unknown, record: SalesTransactionResponse) =>
        record.eligibleForConsolidation ? <Tag color="success">Yes</Tag> : <Tag color="warning">Check</Tag>,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={transactions}
      columns={columns}
      pagination={false}
      size="small"
      scroll={{ x: 'max-content' }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectionChange(keys as number[]),
      }}
    />
  );
}
