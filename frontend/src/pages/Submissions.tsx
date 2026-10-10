import { Card, Grid, Tabs, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';
import InvoiceList from '../components/InvoiceList';
import type { InvoiceRow } from '../components/InvoiceList';
import { invoiceDisplayName } from '../utils/invoice';
import { useUpload } from '../upload/UploadContext';
import type { UploadKind } from '../upload/UploadContext';

// In-flight uploads of this kind, shown as "Parsing…" placeholder rows that link to the loading view.
function usePendingRows(kind: UploadKind, type: 'Individual' | 'Consolidated'): InvoiceRow[] {
  const { jobs } = useUpload();
  return jobs
    .filter((j) => j.status === 'running' && j.kind === kind)
    .map((j) => ({
      id: -1,
      createdAt: new Date().toISOString(),
      name: j.label,
      grandTotal: null,
      status: 'PARSING',
      type,
      to: `/parsing/${j.id}`,
      pending: true,
    }));
}

function IndividualSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const pending = usePendingRows('individual', 'Individual');
  const rows: InvoiceRow[] = [
    ...pending,
    ...(data ?? []).map((inv: MappedInvoiceResponse) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: invoiceDisplayName(inv.invoiceName, inv.id, inv.createdAt ?? inv.issueDate),
      grandTotal: inv.grandTotal,
      status: inv.status,
      type: 'Individual' as const,
      to: `/mapped-invoices/${inv.id}`,
    })),
  ];

  return (
    <InvoiceList
      rows={rows}
      mobile={mobile}
      loading={isLoading}
      statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
      emptyText="No individual invoices yet. Create one from Create → Individual."
    />
  );
}

function ConsolidatedSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });
  const pending = usePendingRows('consolidated', 'Consolidated');
  const rows: InvoiceRow[] = [
    ...pending,
    ...(data ?? []).map((inv: ConsolidatedInvoiceResponse) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: invoiceDisplayName(inv.invoiceName, inv.id, inv.createdAt ?? inv.periodStart),
      grandTotal: inv.grandTotal,
      status: inv.status,
      type: 'Consolidated' as const,
      to: `/consolidated-invoices/${inv.id}`,
    })),
  ];

  return (
    <InvoiceList
      rows={rows}
      mobile={mobile}
      loading={isLoading}
      statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
      emptyText="No consolidated invoices yet. Create one from Create → Consolidated."
    />
  );
}

export default function Submissions() {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const [params, setParams] = useSearchParams();
  const activeKey = params.get('tab') === 'consolidated' ? 'consolidated' : 'individual';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Submissions
      </Typography.Title>
      <Card styles={{ body: { padding: mobile ? 12 : 24 } }}>
        <Tabs
          activeKey={activeKey}
          onChange={(k) => setParams(k === 'consolidated' ? { tab: 'consolidated' } : {})}
          items={[
            { key: 'individual', label: 'Individual', children: <IndividualSubmissions mobile={mobile} /> },
            { key: 'consolidated', label: 'Consolidated', children: <ConsolidatedSubmissions mobile={mobile} /> },
          ]}
        />
      </Card>
    </div>
  );
}
