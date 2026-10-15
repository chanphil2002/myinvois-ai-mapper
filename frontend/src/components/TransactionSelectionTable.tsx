import { Button, Checkbox, List, Table, Tag } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import { formatRM } from '../utils/money';
import type { SalesTransactionResponse } from '../api/types';
import { tablePagination } from '../utils/pagination';
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
  const mobile = useIsMobile();
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

  if (mobile) {
    // Phones: a tappable checklist (the whole row toggles) instead of a wide checkbox table.
    const all = transactions.length > 0 && selectedIds.length === transactions.length;
    const toggle = (id: number) =>
      onSelectionChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    return (
      <div>
        {transactions.length > 0 && (
          <Button
            type="link"
            style={{ paddingLeft: 0 }}
            onClick={() => onSelectionChange(all ? [] : transactions.map((t) => t.id))}
          >
            {all ? 'Clear selection' : `Select all ${transactions.length}`}
          </Button>
        )}
        <List
          loading={loading}
          dataSource={transactions}
          rowKey="id"
          split={false}
          locale={{ emptyText: 'Nothing waiting — every extracted sale is already in an invoice.' }}
          pagination={
            transactions.length > 10 ? { pageSize: 10, align: 'center', showSizeChanger: false } : false
          }
          renderItem={(t: SalesTransactionResponse) => {
            const checked = selectedIds.includes(t.id);
            return (
              <div
                role="checkbox"
                aria-checked={checked}
                tabIndex={0}
                onClick={() => toggle(t.id)}
                onKeyDown={(e) => (e.key === ' ' || e.key === 'Enter') && toggle(t.id)}
                style={{
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                  padding: '12px 8px',
                  minHeight: 44,
                  cursor: 'pointer',
                  borderBottom: `1px solid ${palette.border}`,
                  background: confidenceTint(t.confidenceScore, palette),
                }}
              >
                <Checkbox checked={checked} style={{ marginTop: 2, pointerEvents: 'none' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <span style={{ flex: 1, minWidth: 0, fontWeight: 500, overflowWrap: 'anywhere' }}>{t.description}</span>
                    <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
                      {formatRM(Number(t.quantity) * Number(t.unitPrice) + Number(t.taxAmount))}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: palette.textSecondary, marginTop: 2 }}>
                    {t.transactionDate ?? 'No date'} · {Number(t.quantity)} × {formatRM(t.unitPrice)}
                    {!t.eligibleForConsolidation && (
                      <Tag color="warning" style={{ marginLeft: 6 }}>
                        Check
                      </Tag>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        />
      </div>
    );
  }

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={transactions}
      columns={columns}
      pagination={tablePagination(transactions.length)}
      size="small"
      scroll={{ x: 'max-content' }}
      rowSelection={{
        selectedRowKeys: selectedIds,
        onChange: (keys) => onSelectionChange(keys as number[]),
        // Header checkbox only covers the visible page; these let you act on every page at once.
        selections: [Table.SELECTION_ALL, Table.SELECTION_INVERT, Table.SELECTION_NONE],
        preserveSelectedRowKeys: true,
      }}
    />
  );
}
