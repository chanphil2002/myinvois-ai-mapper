import type { ReactNode } from 'react';
import { Card, Col, Grid, Progress, Row, Typography, theme } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { getSubscription, listDocuments, listMappedInvoices } from '../api/endpoints';
import type { MappedInvoiceResponse } from '../api/types';
import InvoiceList from '../components/InvoiceList';
import type { InvoiceRow } from '../components/InvoiceList';

const PLAN_CREDITS: Record<string, number> = { beginner: 30, heavy: 500, elite: 1500 };
const FREE_DAILY_CREDITS = 2; // Free tier: 2 documents per day.

const invoiceName = (inv: MappedInvoiceResponse) =>
  inv.buyerName?.trim() || `Invoice-${(inv.createdAt ?? inv.issueDate ?? '').slice(0, 10) || '—'}#${inv.id}`;

function StatTile({ title, value, icon, color }: { title: string; value: number; icon: ReactNode; color: string }) {
  const { token } = theme.useToken();
  return (
    <Card size="small" style={{ height: '100%' }} styles={{ body: { padding: 14 } }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color,
            background: `${color}22`,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, lineHeight: 1.2 }}>{title}</div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.md;
  const { data: documents } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });
  const { data: invoices, isLoading } = useQuery({ queryKey: ['mapped-invoices'], queryFn: listMappedInvoices });
  const { data: subscription } = useQuery({ queryKey: ['subscription'], queryFn: getSubscription });

  const parsed = documents?.filter((d) => d.status === 'PARSED').length ?? 0;

  // Invoice-centric counts so the home reads as "work", not raw files.
  const list = invoices ?? [];
  const drafts = list.filter((i) => i.status === 'DRAFT').length;
  const inProgress = list.filter((i) => i.status === 'CONFIRMED' || i.status === 'SUBMITTED').length;
  const accepted = list.filter((i) => i.status === 'ACCEPTED').length;

  const planId = subscription?.status === 'ACTIVE' ? subscription.plan : null;
  const planName = planId ? subscription?.planName : 'Free';
  const isFree = !planId;

  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const parsedToday = documents?.filter((d) => d.status === 'PARSED' && d.uploadedAt && isToday(d.uploadedAt)).length ?? 0;

  const creditLimit = isFree ? FREE_DAILY_CREDITS : PLAN_CREDITS[planId] ?? FREE_DAILY_CREDITS;
  const creditsUsed = isFree ? parsedToday : parsed;
  const creditsLeft = Math.max(0, creditLimit - creditsUsed);
  const creditPct = creditLimit > 0 ? Math.round((creditsLeft / creditLimit) * 100) : 0;
  const periodLabel = isFree ? 'left today' : 'left';

  const recent: InvoiceRow[] = [...list]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? '') || b.id - a.id)
    .slice(0, 6)
    .map((inv) => ({
      id: inv.id,
      createdAt: inv.createdAt,
      name: invoiceName(inv),
      grandTotal: inv.grandTotal,
      status: inv.status,
      to: `/mapped-invoices/${inv.id}`,
    }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>

      {/* Invoice-centric stat row */}
      <Row gutter={[12, 12]}>
        <Col xs={8}>
          <StatTile title="To review" value={drafts} icon={<FileTextOutlined />} color="#3b5bdb" />
        </Col>
        <Col xs={8}>
          <StatTile title="In progress" value={inProgress} icon={<ThunderboltOutlined />} color="#f59e0b" />
        </Col>
        <Col xs={8}>
          <StatTile title="Accepted" value={accepted} icon={<CheckCircleOutlined />} color="#16a34a" />
        </Col>
      </Row>

      {/* AI parsing credits */}
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
            <div>
              <Typography.Text strong>AI parsing credits</Typography.Text>
              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                {planName} plan {isFree && <Link to="/billing">· upgrade</Link>}
              </div>
            </div>
          </div>
          <Typography.Text style={{ fontSize: 16 }}>
            <strong style={{ color: creditsLeft === 0 ? '#dc2626' : token.colorText }}>{creditsLeft}</strong>
            <span style={{ color: token.colorTextTertiary }}> / {creditLimit} {periodLabel}</span>
          </Typography.Text>
        </div>
        <Progress
          percent={creditPct}
          showInfo={false}
          strokeColor={creditsLeft === 0 ? '#dc2626' : '#3b5bdb'}
          style={{ marginTop: 10, marginBottom: 0 }}
        />
      </Card>

      <Card
        title="Recent e-invoices"
        extra={<Link to="/create">Create an invoice</Link>}
        styles={{ body: { padding: mobile ? 12 : 24 } }}
      >
        <InvoiceList
          rows={recent}
          mobile={mobile}
          loading={isLoading}
          paginate={false}
          statuses={['DRAFT', 'CONFIRMED', 'SUBMITTED', 'ACCEPTED', 'REJECTED']}
          emptyText="No e-invoices yet — create one from Create. Each invoice keeps its source file (or manual entry) inside it."
        />
      </Card>
    </div>
  );
}
