import type React from 'react';
import { useEffect, useState } from 'react';
import { Card, Pagination, Spin, Table, Tag, Typography, theme } from 'antd';
import { AppstoreOutlined, LoadingOutlined, RightOutlined, UserOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import StatusTag, { statusLabel } from './StatusTag';
import { useTheme } from '../theme/ThemeContext';

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

// Type is a category, not a state, so it stays quiet: a neutral graphite chip with a coloured
// icon, leaving the bright colours to the status tag beside it.
function TypeTag({ type }: { type: InvoiceType }) {
  const { palette: p } = useTheme();
  const individual = type === 'Individual';
  return (
    <Tag
      bordered
      icon={individual ? <UserOutlined style={{ color: p.info }} /> : <AppstoreOutlined style={{ color: p.link }} />}
      style={{ background: p.subtle, borderColor: p.border, color: p.textSecondary, marginInlineEnd: 0 }}
    >
      {type}
    </Tag>
  );
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
  showType,
  typeFilter,
  statusFilter,
  onFilters,
  height,
}: {
  rows: InvoiceRow[];
  loading: boolean;
  statuses: string[];
  emptyText: string;
  showType: boolean;
  typeFilter: string[];
  statusFilter: string[];
  onFilters: (type: string[], status: string[]) => void;
  /** Fixed body height (scrolls inside) so the surrounding card never grows or shrinks. */
  height?: number;
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
            filteredValue: typeFilter,
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
      // Same names the status tags show (Editing, Reviewing…), not the internal codes.
      filters: statuses.map((s) => ({ text: statusLabel(s), value: s })),
      filteredValue: statusFilter,
      render: (status: string) => <StatusTag status={status} />,
    },
  ];

  return (
    <Table
      rowKey={(r) => r.to}
      loading={loading}
      dataSource={rows}
      columns={columns}
      pagination={false}
      scroll={height ? { y: height } : undefined}
      onChange={(_p, filters) =>
        onFilters((filters.type as string[] | null) ?? [], (filters.status as string[] | null) ?? [])
      }
      locale={{ emptyText }}
    />
  );
}

/**
 * Responsive list of e-invoices: tappable cards on mobile, a table on wider screens. Filtering and
 * paging happen here (not inside the table) so a filter applies across every page, and the page
 * numbers can stay pinned at the bottom of a fixed-height box.
 */
export default function InvoiceList({
  rows,
  mobile,
  statuses,
  emptyText,
  loading = false,
  paginate = true,
  pageSize = 10,
  showType = false,
  fixedBodyHeight,
}: {
  rows: InvoiceRow[];
  mobile: boolean;
  statuses: string[];
  emptyText: string;
  loading?: boolean;
  paginate?: boolean;
  pageSize?: number;
  showType?: boolean;
  /** Desktop only: keep the table body this tall regardless of how many rows there are. */
  fixedBodyHeight?: number;
}) {
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string[]>([]);

  const filtered = rows.filter(
    (r) =>
      (typeFilter.length === 0 || typeFilter.includes(r.type)) &&
      (statusFilter.length === 0 || statusFilter.includes(r.status)),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  // Back to page 1 whenever the data or filters change underneath us.
  useEffect(() => setPage(1), [rows.length, typeFilter, statusFilter]);
  const current = Math.min(page, pages);
  const visible = paginate ? filtered.slice((current - 1) * pageSize, current * pageSize) : filtered;

  const pager = paginate && (filtered.length > pageSize || fixedBodyHeight) && (
    <Pagination
      size="small"
      align="end"
      current={current}
      pageSize={pageSize}
      total={filtered.length}
      showSizeChanger={false}
      showTotal={(t, [from, to]) => (t ? `${from}–${to} of ${t}` : '')}
      onChange={setPage}
      style={{ marginTop: 12 }}
    />
  );

  if (mobile) {
    return (
      <>
        {visible.length ? (
          <Cards rows={visible} showType={showType} />
        ) : (
          <Typography.Text type="secondary">{emptyText}</Typography.Text>
        )}
        {pager}
      </>
    );
  }
  return (
    <div
      className={fixedBodyHeight ? 'fixed-table' : undefined}
      style={fixedBodyHeight ? ({ '--table-body-h': `${fixedBodyHeight}px` } as React.CSSProperties) : undefined}
    >
      <DesktopTable
        rows={visible}
        loading={loading}
        statuses={statuses}
        emptyText={emptyText}
        showType={showType}
        typeFilter={typeFilter}
        statusFilter={statusFilter}
        onFilters={(t, s) => {
          setTypeFilter(t);
          setStatusFilter(s);
        }}
        height={fixedBodyHeight}
      />
      {pager}
    </div>
  );
}
