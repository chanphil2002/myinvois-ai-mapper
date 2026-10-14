import type { ReactNode } from 'react';
import { Button, Card, Col, Grid, Progress, Row, Typography, theme } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ThunderboltOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getUsage, listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import InvoiceList from '../components/InvoiceList';
import Page from '../components/Page';
import type { InvoiceRow } from '../components/InvoiceList';
import { invoiceDisplayName } from '../utils/invoice';
import { useUpload } from '../upload/UploadContext';
import { useTheme } from '../theme/ThemeContext';

function StatTile({ title, value, icon, color, soft }: { title: string; value: number; icon: ReactNode; color: string; soft: string }) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  // On a phone three tiles share the row, so stack icon/number/label vertically and give the
  // label the full tile width — otherwise long labels ("In progress") overflow the tiny column.
  const stacked = !screens.sm;
  return (
    <Card size="small" style={{ height: '100%' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: stacked ? 'column' : 'row',
          alignItems: 'center',
          textAlign: stacked ? 'center' : 'left',
          gap: stacked ? 4 : 12,
        }}
      >
        <div
          style={{
            width: stacked ? 32 : 38,
            height: stacked ? 32 : 38,
            borderRadius: 10,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: stacked ? 15 : 18,
            color,
            background: soft,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0, maxWidth: '100%' }}>
          <div style={{ fontSize: stacked ? 20 : 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
          <div
            style={{
              fontSize: stacked ? 11 : 12,
              color: token.colorTextSecondary,
              lineHeight: 1.2,
              overflowWrap: 'break-word',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { token } = theme.useToken();
  const { palette: p } = useTheme();
  const navigate = useNavigate();
  const { jobs } = useUpload();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const { data: individual, isLoading: loadingInd } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const { data: consolidated, isLoading: loadingCon } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: getUsage });
  const isLoading = loadingInd || loadingCon;

  // Unified list across both invoice types, so the home shows every e-invoice with its type.
  const allRows: InvoiceRow[] = [
    ...(individual ?? []).map((inv) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: invoiceDisplayName(inv.invoiceName, inv.id, inv.createdAt ?? inv.issueDate),
      grandTotal: inv.grandTotal,
      status: inv.status,
      type: 'Individual' as const,
      to: `/mapped-invoices/${inv.id}`,
    })),
    ...(consolidated ?? []).map((inv) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: invoiceDisplayName(inv.invoiceName, inv.id, inv.createdAt ?? inv.periodStart),
      grandTotal: inv.grandTotal,
      status: inv.status,
      type: 'Consolidated' as const,
      to: `/consolidated-invoices/${inv.id}`,
    })),
  ];

  const drafts = allRows.filter((i) => i.status === 'DRAFT').length;
  const inProgress = allRows.filter((i) => i.status === 'CONFIRMED' || i.status === 'SUBMITTED').length;
  const accepted = allRows.filter((i) => i.status === 'ACCEPTED').length;

  // AI usage is metered server-side by what each AI call actually cost (tokens), as a % of the
  // plan's allowance — a heavy document uses more than a light one. The client only displays it.
  const planName = usage?.planName ?? 'Free';
  const isFree = usage?.free ?? true;
  const usedPct = Math.min(100, usage?.usedPercent ?? 0);
  const exhausted = usedPct >= 100;
  const nearLimit = usedPct >= 80;
  const docsLeft = usage?.typicalDocumentsLeft ?? 0;
  const periodLabel = usage?.periodLabel ?? '';

  // Uploads still processing show as non-clickable "Parsing…" placeholder rows at the top,
  // until the real invoice lands (the banner also tracks them).
  const pendingRows: InvoiceRow[] = jobs
    .filter((j) => j.status === 'running' && j.draftId === undefined)
    .map((j) => ({
      id: -1,
      createdAt: new Date().toISOString(),
      name: j.label,
      grandTotal: null,
      status: 'PARSING',
      type: j.kind === 'consolidated' ? ('Consolidated' as const) : ('Individual' as const),
      to: `/parsing/${j.id}`,
      pending: true,
    }));

  const recent: InvoiceRow[] = [
    ...pendingRows,
    ...[...allRows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id).slice(0, 6),
  ];

  return (
    <Page title="Dashboard">

      {/* Invoice-centric stat row */}
      <Row gutter={[12, 12]}>
        <Col xs={8}>
          <StatTile title="To review" value={drafts} icon={<FileTextOutlined />} color={p.info} soft={p.infoSoft} />
        </Col>
        <Col xs={8}>
          <StatTile title="In progress" value={inProgress} icon={<ThunderboltOutlined />} color={p.warning} soft={p.warningSoft} />
        </Col>
        <Col xs={8}>
          <StatTile title="Accepted" value={accepted} icon={<CheckCircleOutlined />} color={p.success} soft={p.successSoft} />
        </Col>
      </Row>

      {/* AI parsing credits */}
      <Card size="small">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThunderboltOutlined style={{ color: p.warning, fontSize: 18 }} />
            <div>
              <Typography.Text strong>AI usage</Typography.Text>
              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                {planName} plan {isFree && <Link to="/billing">· upgrade</Link>}
              </div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Typography.Text style={{ fontSize: 16 }}>
              <strong style={{ color: exhausted ? p.error : nearLimit ? p.warning : token.colorText }}>
                {usedPct.toFixed(usedPct < 10 && usedPct > 0 ? 1 : 0)}%
              </strong>
              <span style={{ color: token.colorTextTertiary }}> used {periodLabel}</span>
            </Typography.Text>
            <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
              {exhausted ? 'Allowance used up' : `≈ ${docsLeft.toLocaleString()} typical document${docsLeft === 1 ? '' : 's'} left`}
            </div>
          </div>
        </div>
        <Progress
          percent={usedPct}
          showInfo={false}
          strokeColor={exhausted ? p.error : nearLimit ? p.warning : p.primary}
          trailColor={p.borderStrong}
          style={{ marginTop: 10, marginBottom: 0 }}
        />
      </Card>

      <Card
        title="Recent e-invoices"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigate('/create')}>
            Create an invoice
          </Button>
        }
      >
        <InvoiceList
          rows={recent}
          mobile={mobile}
          loading={isLoading}
          paginate={false}
          showType
          statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
          emptyText="No e-invoices yet — create one from Create. Each invoice keeps its source file (or manual entry) inside it."
        />
      </Card>
    </Page>
  );
}
