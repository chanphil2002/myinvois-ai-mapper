import type { Key } from 'react';
import { Card, Spin, Table, Tag, Typography, theme } from 'antd';
import { LoadingOutlined, RightOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import StatusTag from './StatusTag';

export type InvoiceType = 'Individual' | 'Consolidated';

export interface InvoiceRow {
  id: number;
  createdAt: string | null;
  name: string;
  grandTotal: number | null;
  status: string;
  type: InvoiceType;
  to: string;
  /** A not-yet-created invoice that's still uploading/parsing — shown as a non-clickable placeholder. */
  pending?: boolean;
}

const money = (v: number | null | undefined) =>
  v == null ? '—' : `RM ${Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const dateTime = (iso: string | null | undefined) => (iso ? dayjs(iso).format('MMM D, YY - HH:mm') : '—');

function TypeTag({ type }: { type: InvoiceType }) {
  return <Tag color={type === 'Individual' ? 'geekblue' : 'purple'}>{type}</Tag>;
}

/** Mobile: each invoice as a tappable card so there's no horizontal scrolling. */
function Cards({ rows, showType }: { rows: InvoiceRow[]; showType: boolean }) {
  const { token } = theme.useToken();
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((r) => (
        <Link key={r.to} to={r.to} style={{ color: 'inherit' }}>
          <Card size="small" hoverable>
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
                  {r.pending && <Spin indicator={<LoadingOutlined spin />} size="small" style={{ marginRight: 6 }} />}
                  {r.name}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600 }}>{money(r.grandTotal)}</span>
                  <StatusTag status={r.status} />
                  {showType && !r.pending && <TypeTag type={r.type} />}
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

/** Desktop: table with the invoice name as the link (no separate action column). */
function DesktopTable({
  rows,
  loading,
  statuses,
  emptyText,
  paginate,
  showType,
}: {
  rows: InvoiceRow[];
  loading: boolean;
  statuses: string[];
  emptyText: string;
  paginate: boolean;
  showType: boolean;
}) {
  const columns = [
    { title: 'Date', dataIndex: 'createdAt', key: 'createdAt', width: 170, render: dateTime },
    {
      title: 'Invoice',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
      render: (v: string, r: InvoiceRow) => (
        <Link to={r.to} style={{ fontWeight: 600 }}>
          {r.pending && <Spin indicator={<LoadingOutlined spin />} size="small" style={{ marginRight: 6 }} />}
          {v}
        </Link>
      ),
    },
    ...(showType
      ? [
          {
            title: 'Type',
            dataIndex: 'type',
            key: 'type',
            width: 140,
            filters: [
              { text: 'Individual', value: 'Individual' },
              { text: 'Consolidated', value: 'Consolidated' },
            ],
            onFilter: (value: boolean | Key, record: InvoiceRow) => record.type === value,
            render: (type: InvoiceType, r: InvoiceRow) => (r.pending ? null : <TypeTag type={type} />),
          },
        ]
      : []),
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
  ];

  return (
    <Table
      rowKey={(r) => r.to}
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
  showType = false,
}: {
  rows: InvoiceRow[];
  mobile: boolean;
  statuses: string[];
  emptyText: string;
  loading?: boolean;
  paginate?: boolean;
  showType?: boolean;
}) {
  if (mobile) {
    return rows.length ? (
      <Cards rows={rows} showType={showType} />
    ) : (
      <Typography.Text type="secondary">{emptyText}</Typography.Text>
    );
  }
  return (
    <DesktopTable
      rows={rows}
      loading={loading}
      statuses={statuses}
      emptyText={emptyText}
      paginate={paginate}
      showType={showType}
    />
  );
}
