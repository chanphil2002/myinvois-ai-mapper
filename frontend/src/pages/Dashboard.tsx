import { useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Card, Col, Grid, Progress, Row, Tag, Typography, theme } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ThunderboltOutlined, PlusOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getUsage, listConsolidatedInvoices, listMappedInvoices } from '../api/endpoints';
import InvoiceList from '../components/InvoiceList';
import Page from '../components/Page';
import DocumentStatsCard from '../components/DocumentStatsCard';
import type { InvoiceRow } from '../components/InvoiceList';
import { invoiceDisplayName } from '../utils/invoice';
import { useUpload } from '../upload/UploadContext';
import { useTheme } from '../theme/ThemeContext';
import { useIsMobile } from '../hooks/useIsMobile';

function StatTile({
  title,
  value,
  icon,
  color,
  soft,
  active,
  onClick,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  color: string;
  soft: string;
  active: boolean;
  onClick: () => void;
}) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  // On a phone three tiles share the row, so stack icon/number/label vertically and give the
  // label the full tile width — otherwise long labels ("In progress") overflow the tiny column.
  const stacked = !screens.sm;
  return (
    // A filter toggle for the invoice list below: tap to show only these, tap again to clear.
    <Card
      size="small"
      hoverable
      role="button"
      tabIndex={0}
      aria-pressed={active}
      onClick={onClick}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), onClick())}
      className={active ? 'stat-tile stat-tile-active' : 'stat-tile'}
      style={{
        height: '100%',
        cursor: 'pointer',
        borderColor: active ? color : undefined,
        background: active ? `linear-gradient(135deg, ${soft}, transparent 90%)` : undefined,
        boxShadow: active ? `0 0 0 1px ${color}` : undefined,
      }}
    >
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

type FilterKey = 'review' | 'progress' | 'accepted';

/** Table body height: 10 rows (~53px each) — the box stays this size whether it holds 1 row or 10. */
const RECENT_BODY_HEIGHT = 530;

const FILTERS: Record<FilterKey, { label: string; statuses: string[] }> = {
  review: { label: 'To review', statuses: ['DRAFT'] },
  progress: { label: 'In progress', statuses: ['CONFIRMED', 'SUBMITTED'] },
  accepted: { label: 'Accepted', statuses: ['ACCEPTED'] },
};

export default function Dashboard() {
  const { token } = theme.useToken();
  const { palette: p } = useTheme();
  const navigate = useNavigate();
  const { jobs } = useUpload();
  const mobile = useIsMobile();
  const wide = Grid.useBreakpoint().xl ?? false;
  const { data: individual, isLoading: loadingInd } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const { data: consolidated, isLoading: loadingCon } = useQuery({ queryKey: ['consolidated-invoices'], queryFn: listConsolidatedInvoices });
  const { data: usage } = useQuery({ queryKey: ['usage'], queryFn: getUsage });
  const isLoading = loadingInd || loadingCon;
  const [filter, setFilter] = useState<FilterKey | null>(null);

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

  const sorted = [...allRows].sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id);
  const filtered = filter ? sorted.filter((r) => FILTERS[filter].statuses.includes(r.status)) : sorted;
  // Everything, newest first, 10 per page (in-flight uploads on top when not filtering).
  const recent: InvoiceRow[] = filter ? filtered : [...pendingRows, ...sorted];
  const toggle = (f: FilterKey) => setFilter((cur) => (cur === f ? null : f));

  return (
    <Page title="Dashboard">

      {/* Columns stretch to equal height: the side panel ends exactly where the invoice table does. */}
      <Row gutter={[16, 16]} style={{ alignItems: 'stretch' }}>
        {/* Side panel from 1200px; below that it stacks under the list (the table needs the width). */}
        <Col xs={24} xl={16} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Invoice-centric stat row — each tile filters the list below */}
      <Row gutter={[12, 12]}>
        <Col xs={8}>
          <StatTile title="To review" value={drafts} icon={<FileTextOutlined />} color={p.info} soft={p.infoSoft}
            active={filter === 'review'} onClick={() => toggle('review')} />
        </Col>
        <Col xs={8}>
          <StatTile title="In progress" value={inProgress} icon={<ThunderboltOutlined />} color={p.warning} soft={p.warningSoft}
            active={filter === 'progress'} onClick={() => toggle('progress')} />
        </Col>
        <Col xs={8}>
          <StatTile title="Accepted" value={accepted} icon={<CheckCircleOutlined />} color={p.success} soft={p.successSoft}
            active={filter === 'accepted'} onClick={() => toggle('accepted')} />
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
          className={exhausted || nearLimit ? undefined : 'gradient-progress'}
          trailColor={p.borderStrong}
          style={{ marginTop: 10, marginBottom: 0 }}
        />
      </Card>

      <Card
        title={
          filter ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              {FILTERS[filter].label}
              <Tag closable onClose={(e) => (e.preventDefault(), setFilter(null))} style={{ marginInlineEnd: 0, fontWeight: 400 }}>
                {filtered.length} shown
              </Tag>
            </span>
          ) : (
            'Recent e-invoices'
          )
        }
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
          paginate
          pageSize={10}
          fixedBodyHeight={mobile ? undefined : RECENT_BODY_HEIGHT}
          showType
          statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
          emptyText={
            filter
              ? `Nothing ${FILTERS[filter].label.toLowerCase()} right now.`
              : 'No e-invoices yet — create one from Create. Each invoice keeps its source file (or manual entry) inside it.'
          }
        />
      </Card>
        </Col>
        <Col xs={24} xl={8} style={{ display: 'flex' }}>
          <DocumentStatsCard fill={wide} />
        </Col>
      </Row>
    </Page>
  );
}
