import type { Key } from 'react';
import { Card, Table, Tabs, Typography } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';
import StatusTag from '../components/StatusTag';

const money = (v: number | null | undefined) =>
  v == null ? '—' : `RM ${Number(v).toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function IndividualSubmissions() {
  const { data, isLoading: loading } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const invoices: MappedInvoiceResponse[] = (data ?? []).filter((invoice) => invoice.status !== 'DRAFT');

  const columns = [
    { title: 'Invoice #', dataIndex: 'id', key: 'id', render: (id: number) => <strong>#{id}</strong> },
    { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName', ellipsis: true, render: (v: string) => v || '—' },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName', ellipsis: true, render: (v: string) => v || '—' },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right' as const, render: money },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: ['CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED'].map((s) => ({ text: s, value: s })),
      onFilter: (value: boolean | Key, record: MappedInvoiceResponse) => record.status === value,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '',
      key: 'view',
      width: 80,
      render: (_: unknown, record: MappedInvoiceResponse) => (
        <Link to={`/mapped-invoices/${record.id}`}>
          <EyeOutlined /> View
        </Link>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={invoices}
      columns={columns}
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'No individual submissions yet. Create one from Create → Individual.' }}
    />
  );
}

function ConsolidatedSubmissions() {
  const { data: invoices, isLoading } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });

  const columns = [
    { title: 'Invoice #', dataIndex: 'id', key: 'id', render: (id: number) => <strong>#{id}</strong> },
    { title: 'Period', key: 'period', render: (_: unknown, r: ConsolidatedInvoiceResponse) => `${r.periodStart} — ${r.periodEnd}` },
    { title: 'Lines', key: 'count', align: 'right' as const, render: (_: unknown, r: ConsolidatedInvoiceResponse) => r.transactions.length },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal', align: 'right' as const, render: money },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: ['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED'].map((s) => ({ text: s, value: s })),
      onFilter: (value: boolean | Key, record: ConsolidatedInvoiceResponse) => record.status === value,
      render: (status: string) => <StatusTag status={status} />,
    },
    {
      title: '',
      key: 'view',
      width: 80,
      render: (_: unknown, record: ConsolidatedInvoiceResponse) => (
        <Link to={`/consolidated-invoices/${record.id}`}>
          <EyeOutlined /> View
        </Link>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={invoices ?? []}
      columns={columns}
      pagination={{ pageSize: 10, hideOnSinglePage: true }}
      scroll={{ x: 'max-content' }}
      locale={{ emptyText: 'No consolidated submissions yet. Create one from Create → Consolidated.' }}
    />
  );
}

export default function Submissions() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Submissions
      </Typography.Title>
      <Card>
        <Tabs
          items={[
            { key: 'individual', label: 'Individual', children: <IndividualSubmissions /> },
            { key: 'consolidated', label: 'Consolidated', children: <ConsolidatedSubmissions /> },
          ]}
        />
      </Card>
    </div>
  );
}
