import { Card, Table, Tabs, Tag, Typography } from 'antd';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listConsolidatedInvoices, listDocuments, listMappingsForDocument } from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';

function IndividualSubmissions() {
  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });

  const mappingQueries = useQueries({
    queries: (documents ?? []).map((doc) => ({
      queryKey: ['mappings', doc.id],
      queryFn: () => listMappingsForDocument(doc.id),
      enabled: !!documents,
    })),
  });

  const loading = mappingQueries.some((q) => q.isLoading);
  const invoices: MappedInvoiceResponse[] = mappingQueries
    .flatMap((q) => q.data ?? [])
    .filter((invoice) => invoice.status !== 'DRAFT');

  const columns = [
    { title: 'Invoice #', dataIndex: 'id', key: 'id' },
    { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag>{status}</Tag> },
    {
      title: '',
      key: 'view',
      render: (_: unknown, record: MappedInvoiceResponse) => <Link to={`/mapped-invoices/${record.id}`}>View</Link>,
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={loading}
      dataSource={invoices}
      columns={columns}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
    />
  );
}

function ConsolidatedSubmissions() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ['consolidated-invoices'],
    queryFn: listConsolidatedInvoices,
  });

  const columns = [
    { title: 'Invoice #', dataIndex: 'id', key: 'id' },
    {
      title: 'Period',
      key: 'period',
      render: (_: unknown, r: ConsolidatedInvoiceResponse) => `${r.periodStart} — ${r.periodEnd}`,
    },
    {
      title: 'Lines',
      key: 'count',
      render: (_: unknown, r: ConsolidatedInvoiceResponse) => r.transactions.length,
    },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (status: string) => <Tag>{status}</Tag> },
    {
      title: '',
      key: 'view',
      render: (_: unknown, record: ConsolidatedInvoiceResponse) => (
        <Link to={`/consolidated-invoices/${record.id}`}>View</Link>
      ),
    },
  ];

  return (
    <Table
      rowKey="id"
      loading={isLoading}
      dataSource={invoices ?? []}
      columns={columns}
      pagination={{ pageSize: 10 }}
      scroll={{ x: 'max-content' }}
    />
  );
}

export default function Submissions() {
  return (
    <Card>
      <Typography.Title level={4}>Submissions</Typography.Title>
      <Tabs
        items={[
          { key: 'individual', label: 'Individual', children: <IndividualSubmissions /> },
          { key: 'consolidated', label: 'Consolidated', children: <ConsolidatedSubmissions /> },
        ]}
      />
    </Card>
  );
}
