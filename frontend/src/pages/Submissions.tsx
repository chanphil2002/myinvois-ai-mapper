import { Card, Grid, Tabs, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';
import InvoiceList from '../components/InvoiceList';
import type { InvoiceRow } from '../components/InvoiceList';

function IndividualSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const rows: InvoiceRow[] = (data ?? [])
    .filter((inv) => inv.status !== 'DRAFT')
    .map((inv: MappedInvoiceResponse) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: inv.buyerName?.trim() || `Invoice-${(inv.createdAt ?? inv.issueDate ?? '').slice(0, 10) || '—'}#${inv.id}`,
      grandTotal: inv.grandTotal,
      status: inv.status,
      to: `/mapped-invoices/${inv.id}`,
    }));

  return (
    <InvoiceList
      rows={rows}
      mobile={mobile}
      loading={isLoading}
      statuses={['CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
      emptyText="No individual submissions yet. Create one from Create → Individual."
    />
  );
}

function ConsolidatedSubmissions({ mobile }: { mobile: boolean }) {
  const { data, isLoading } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });
  const rows: InvoiceRow[] = (data ?? []).map((inv: ConsolidatedInvoiceResponse) => ({
    id: inv.id,
    createdAt: inv.createdAt,
    name: `Consolidated-${inv.periodStart ?? ''}#${inv.id}`,
    grandTotal: inv.grandTotal,
    status: inv.status,
    to: `/consolidated-invoices/${inv.id}`,
  }));

  return (
    <InvoiceList
      rows={rows}
      mobile={mobile}
      loading={isLoading}
      statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
      emptyText="No consolidated submissions yet. Create one from Create → Consolidated."
    />
  );
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
