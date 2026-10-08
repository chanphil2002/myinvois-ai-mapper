import type { Key } from 'react';
import { Card, Table, Typography, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import StatusTag from './StatusTag';

export interface InvoiceRow {
  id: number;
  createdAt: string | null;
  name: string;
  grandTotal: number | null;
  status: string;
  to: string;
}

const money = (v: number | null | undefined) =>
  v == null ? '—' : `RM ${Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (iso: string | null | undefined) => (iso ? dayjs(iso).format('MMM D, YY - HH:mm') : '—');

/** Mobile: each invoice as a tappable card so there's no horizontal scrolling. */
function Cards({ rows }: { rows: InvoiceRow[] }) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <Link key={r.id} to={r.to} style={{ color: 'inherit' }}>
          <Card size="small" hoverable styles={{ body: { padding: 14 } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{dateTime(r.createdAt)}</div>
                <div
                  style={{
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    margin: '2px 0 6px',
                  }}
                >
                  {r.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600 }}>{money(r.grandTotal)}</span>
                  <StatusTag status={r.status} />
                </div>
              </div>
              <RightOutlined style={{ color: token.colorTextQuaternary }} />
            </div>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/** Desktop: table with Date · Invoice · Grand Total · Status · action column order. */
function DesktopTable({
  rows,
  loading,
  statuses,
  emptyText,
  paginate,
}: {
  rows: InvoiceRow[];
  loading: boolean;
  statuses: string[];
  emptyText: string;
  paginate: boolean;
}) {
  const columns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: dateTime },
    { title: 'Invoice', dataIndex: 'name', key: 'name', ellipsis: true, render: (v: string) => <strong>{v}</strong> },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right' as const, render: money },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 130,
      filters: statuses.map((s) => ({ text: s, value: s })),
      onFilter: (value: boolean | Key, record: InvoiceRow) => record.status === value,
      render: (status: string) => <StatusTag status={status} />,
    },
    { title: '', key: 'open', width: 70, render: (_: unknown, record: InvoiceRow) => <Link to={record.to}>Open</Link> },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={rows}
      columns={columns}
      pagination={paginate ? { pageSize: 10, hideOnSinglePage: true } : false}
      locale={{ emptyText }}
    />
  );
}

/** Responsive list of e-invoices: tappable cards on mobile, a table on wider screens. */
export default function InvoiceList({
  rows,
  mobile,
  statuses,
  emptyText,
  loading = false,
  paginate = true,
}: {
  rows: InvoiceRow[];
  mobile: boolean;
  statuses: string[];
  emptyText: string;
  loading?: boolean;
  paginate?: boolean;
}) {
  if (mobile) {
    return rows.length ? <Cards rows={rows} /> : <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  }
  return <DesktopTable rows={rows} loading={loading} statuses={statuses} emptyText={emptyText} paginate={paginate} />;
}
