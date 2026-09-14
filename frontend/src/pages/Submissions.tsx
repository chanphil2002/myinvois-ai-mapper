import { Card, Table, Tag, Typography } from 'antd';
import { useQueries, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listConsolidationBatches, listDocuments, listMappingsForDocument } from '../api/endpoints';
import type { MappedInvoiceResponse } from '../api/types';

export default function Submissions() {
  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });
  const { data: batches } = useQuery({ queryKey: ['consolidation-batches'], queryFn: listConsolidationBatches });

  const mappingQueries = useQueries({
    queries: (documents ?? []).map((doc) => ({
      queryKey: ['mappings', doc.id],
      queryFn: () => listMappingsForDocument(doc.id),
      enabled: !!documents,
    })),
  });

  const loading = mappingQueries.some((q) => q.isLoading);
  // CONSOLIDATED invoices were rolled into a batch, not submitted individually — they belong on
  // the Consolidated e-Invoice page, not here. Batches' own generated result invoices (which have
  // no source document, so listMappingsForDocument never returns them) are added in separately.
  const individualInvoices: MappedInvoiceResponse[] = mappingQueries
    .flatMap((q) => q.data ?? [])
    .filter((invoice) => invoice.status !== 'DRAFT' && invoice.status !== 'CONSOLIDATED');
  const consolidatedResults: MappedInvoiceResponse[] = (batches ?? [])
    .map((batch) => batch.resultInvoice)
    .filter((invoice): invoice is MappedInvoiceResponse => !!invoice && invoice.status !== 'DRAFT');
  const invoices = [...individualInvoices, ...consolidatedResults];

  const columns = [
    { title: 'Invoice #', dataIndex: 'id', key: 'id' },
    { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
    { title: 'Buyer', dataIndex: 'buyerName', key: 'buyerName' },
    { title: 'Grand Total', dataIndex: 'grandTotal', key: 'grandTotal' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: '',
      key: 'view',
      render: (_: unknown, record: MappedInvoiceResponse) => <Link to={`/mapped-invoices/${record.id}`}>View</Link>,
    },
  ];

  return (
    <Card>
      <Typography.Title level={4}>Confirmed &amp; submitted invoices</Typography.Title>
      <Table rowKey="id" loading={loading} dataSource={invoices} columns={columns} pagination={{ pageSize: 10 }} />
    </Card>
  );
}
