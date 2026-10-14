import { Alert, Button, Card, Grid, Tabs, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createConsolidatedInvoice,
  listConsolidatedInvoices,
  listEligibleTransactions,
  listMappedInvoices,
} from '../api/endpoints';
import type { ConsolidatedInvoiceResponse, MappedInvoiceResponse } from '../api/types';
import InvoiceList from '../components/InvoiceList';
import Page from '../components/Page';
import type { InvoiceRow } from '../components/InvoiceList';
import { invoiceDisplayName } from '../utils/invoice';
import { useUpload } from '../upload/UploadContext';
import type { UploadKind } from '../upload/UploadContext';

// In-flight uploads of this kind, shown as "Parsing…" placeholder rows that link to the loading view.
function usePendingRows(kind: UploadKind, type: 'Individual' | 'Consolidated'): InvoiceRow[] {
  const { jobs } = useUpload();
  return jobs
    .filter((j) => j.status === 'running' && j.kind === kind && j.draftId === undefined)
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

// Extracted sales that aren't in any invoice yet (e.g. from older uploads) — one click turns them into a draft.
function UngroupedNotice() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['eligible-transactions'], queryFn: listEligibleTransactions });
  const pool = data ?? [];

  const build = useMutation({
    mutationFn: () => {
      const dates = pool.map((t) => t.transactionDate).filter((d): d is string => !!d).sort();
      const start = dates.length ? dayjs(dates[0]).startOf('month') : dayjs().startOf('month');
      const end = dates.length ? dayjs(dates[dates.length - 1]).endOf('month') : dayjs().endOf('month');
      return createConsolidatedInvoice({
        transactionIds: pool.map((t) => t.id),
        periodStart: start.format('YYYY-MM-DD'),
        periodEnd: end.format('YYYY-MM-DD'),
      });
    },
    onSuccess: (invoice) => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['eligible-transactions'] });
      navigate(`/consolidated-invoices/${invoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not create the draft'),
  });

  if (pool.length === 0) return null;
  return (
    <Alert
      type="info"
      showIcon
      style={{ marginBottom: 16 }}
      message={`${pool.length} extracted sale${pool.length === 1 ? ' isn’t' : 's aren’t'} in any invoice yet`}
      description="They came from earlier uploads. Group them into a draft consolidated invoice (period is taken from their dates)."
      action={
        <Button size="small" type="primary" loading={build.isPending} onClick={() => build.mutate()}>
          Create draft
        </Button>
      }
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
    <>
      <UngroupedNotice />
      <InvoiceList
        rows={rows}
        mobile={mobile}
        loading={isLoading}
        statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
        emptyText="No consolidated invoices yet. Create one from Create → Consolidated."
      />
    </>
  );
}

export default function Submissions() {
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const [params, setParams] = useSearchParams();
  const activeKey = params.get('tab') === 'consolidated' ? 'consolidated' : 'individual';

  return (
    <Page title="Submissions" subtitle="Every e-invoice you've created, by type.">
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
    </Page>
  );
}
