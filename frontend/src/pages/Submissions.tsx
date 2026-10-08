import type { Key } from 'react';
import { Card, Grid, Table, Tabs, Typography, theme } from 'antd';
import { RightOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import dayjs from 'dayjs';
import { listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';
import StatusTag from '../components/StatusTag';

const money = (v: number | null | undefined) =>
  v == null ? '—' : `RM ${Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const dateTime = (iso: string | null | undefined) => (iso ? dayjs(iso).format('MMM D, YY - HH:mm') : '—');

// A single normalised row that both the desktop table and mobile cards render from.
interface Row {
  id: number;
  createdAt: string | null;
  name: string;
  grandTotal: number | null;
  status: string;
  to: string;
}

/** Mobile: each invoice as a tappable card so there's no horizontal scrolling. */
function InvoiceCards({ rows }: { rows: Row[] }) {
  const { token } = theme.useToken();
  if (rows.length === 0) return null;
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

/** Desktop: table with the Datetime · Name · Total · Status · Action column order. */
function InvoiceTable({ rows, loading, statuses, emptyText }: { rows: Row[]; loading: boolean; statuses: string[]; emptyText: string }) {
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
      onFilter: (value: boolean | Key, record: Row) => record.status === value,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '',
      key: 'view',
      width: 70,
      render: (_: unknown, record: Row) => <Link to={record.to}>View</Link>,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={rows}
      columns={columns}
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      locale={{ emptyText }}
    />
  );
}

function IndividualSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const rows: Row[] = (data ?? [])
    .filter((inv) => inv.status !== 'DRAFT')
    .map((inv: MappedInvoiceResponse) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: inv.buyerName?.trim() || `Invoice-${(inv.createdAt ?? inv.issueDate ?? '').slice(0, 10) || '—'}#${inv.id}`,
      grandTotal: inv.grandTotal,
      status: inv.status,
      to: `/mapped-invoices/${inv.id}`,
    }));

  const emptyText = 'No individual submissions yet. Create one from Create → Individual.';
  if (mobile) return rows.length ? <InvoiceCards rows={rows} /> : <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  return <InvoiceTable rows={rows} loading={isLoading} statuses={['CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']} emptyText={emptyText} />;
}

function ConsolidatedSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });
  const rows: Row[] = (data ?? []).map((inv: ConsolidatedInvoiceResponse) => ({
    id: inv.id,
    createdAt: inv.createdAt,
    name: `Consolidated-${inv.periodStart ?? ''}#${inv.id}`,
    grandTotal: inv.grandTotal,
    status: inv.status,
    to: `/consolidated-invoices/${inv.id}`,
  }));

  const emptyText = 'No consolidated submissions yet. Create one from Create → Consolidated.';
  if (mobile) return rows.length ? <InvoiceCards rows={rows} /> : <Typography.Text type="secondary">{emptyText}</Typography.Text>;
  return <InvoiceTable rows={rows} loading={isLoading} statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']} emptyText={emptyText} />;
}

export default function Submissions() {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Submissions
      </Typography.Title>
      <Card styles={{ body: { padding: mobile ? 12 : 24 } }}>
        <Tabs
          items={[
            { key: 'individual', label: 'Individual', children: <IndividualSubmissions mobile={mobile} /> },
            { key: 'consolidated', label: 'Consolidated', children: <ConsolidatedSubmissions mobile={mobile} /> },
          ]}
        />
      </Card>
    </div>
  );
}
