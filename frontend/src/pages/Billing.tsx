import { useEffect, useState } from 'react';
import { Button, Card, Col, Input, Modal, Radio, Row, Space, Switch, Table, Tag, Typography, message } from 'antd';
import { CheckCircleTwoTone, CreditCardOutlined, LockOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  applyReferralCode,
  getSubscription,
  listPayments,
  openBillingPortal,
  setAutoRenew,
  startCheckout,
} from '../api/endpoints';
import type { PaymentRecord } from '../api/types';
import { formatRM } from '../utils/money';
import { useMe } from '../hooks/useMe';
import StatusTag from '../components/StatusTag';
import Page from '../components/Page';
import { useTheme } from '../theme/ThemeContext';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
  free?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 'RM 0',
    period: '',
    tagline: 'For trying things out',
    features: ['AI allowance ≈ 2 documents / day', 'Individual & consolidated e-invoices', 'Submit to MyInvois'],
    free: true,
  },
  {
    id: 'beginner',
    name: 'Beginner',
    price: 'RM 29',
    period: '/month',
    tagline: 'For individuals getting started',
    features: ['AI allowance ≈ 30 documents / month', 'Individual & consolidated e-invoices', 'Submit to MyInvois', 'Email support'],
  },
  {
    id: 'heavy',
    name: 'Heavy',
    price: 'RM 99',
    period: '/month',
    tagline: 'For growing businesses',
    features: ['AI allowance ≈ 500 documents / month', 'Everything in Beginner', 'Priority support'],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'RM 299',
    period: '/month',
    tagline: 'For high-volume senders',
    features: ['AI allowance ≈ 1,500 documents / month', 'Everything in Heavy', 'Bulk & API access', 'Dedicated support'],
  },
];

function PlanCards({
  currentPlan,
  onChoose,
  pendingPlan,
}: {
  currentPlan: string | null;
  onChoose: (id: string) => void;
  pendingPlan: string | null;
}) {
  const { palette } = useTheme();
  const isFreeUser = currentPlan === null;
  return (
    <Row gutter={[16, 16]}>
      {PLANS.map((p) => {
        const isCurrent = p.free ? isFreeUser : p.id === currentPlan;
        return (
          <Col xs={24} sm={12} md={6} key={p.id}>
            <Card
              // Column flex so the action button can be pinned to the card's bottom edge, keeping
              // every plan's button on the same line regardless of how many features it lists.
              style={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderColor: p.popular ? palette.primary : undefined,
              }}
              styles={{ body: { flex: 1, display: 'flex', flexDirection: 'column' } }}
              title={
                <Space>
                  {p.name}
                  {p.popular && <Tag color="success">Popular</Tag>}
                </Space>
              }
            >
              <Typography.Title level={3} style={{ margin: 0 }}>
                {p.price}
                <Typography.Text type="secondary" style={{ fontSize: 14 }}>
                  {' '}
                  {p.period}
                </Typography.Text>
              </Typography.Title>
              <Typography.Paragraph type="secondary">{p.tagline}</Typography.Paragraph>
              <Space direction="vertical" size={4} style={{ marginBottom: 16 }}>
                {p.features.map((f) => (
                  <Space key={f} size={8} align="start">
                    <CheckCircleTwoTone twoToneColor={palette.success} />
                    <span>{f}</span>
                  </Space>
                ))}
              </Space>
              <Button
                style={{ marginTop: 'auto' }}
                type={p.popular ? 'primary' : 'default'}
                block
                disabled={isCurrent || p.free}
                loading={pendingPlan === p.id}
                onClick={() => !p.free && onChoose(p.id)}
              >
                {isCurrent
                  ? 'Current plan'
                  : p.free
                    ? 'Free tier'
                    : currentPlan
                      ? 'Switch to this plan'
                      : 'Subscribe'}
              </Button>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

/** A salesperson's referral code can be added once, any time before or after subscribing. */
function ReferralCard() {
  const queryClient = useQueryClient();
  const { me } = useMe();
  const [code, setCode] = useState('');
  const apply = useMutation({
    mutationFn: () => applyReferralCode(code.trim()),
    onSuccess: (r) => {
      message.success(`Referral code ${r.referralCode} applied`);
      setCode('');
      queryClient.invalidateQueries({ queryKey: ['me'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not apply the code'),
  });
  if (!me) return null;
  return (
    <Card title="Referral code">
      {me.referralCode ? (
        <Typography.Text>
          Referred with code <Typography.Text strong>{me.referralCode}</Typography.Text>.
        </Typography.Text>
      ) : (
        <Space.Compact style={{ width: '100%', maxWidth: 420 }}>
          <Input
            placeholder="Have a code from a MyTax salesperson?"
            value={code}
            autoCapitalize="characters"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onPressEnter={() => code.trim() && apply.mutate()}
          />
          <Button type="primary" disabled={!code.trim()} loading={apply.isPending} onClick={() => apply.mutate()}>
            Apply
          </Button>
        </Space.Compact>
      )}
    </Card>
  );
}

const PRICE_BY_PLAN: Record<string, string> = Object.fromEntries(PLANS.map((p) => [p.id, p.price]));

/** Pick how to pay: auto-renewing (card / Apple Pay) or a one-off 30 days (also FPX). */
function PayModal({ plan, onClose }: { plan: string | null; onClose: () => void }) {
  const { palette: p } = useTheme();
  const [autoRenew, setAutoRenew] = useState(true);
  const checkout = useMutation({
    mutationFn: () => startCheckout(plan!, autoRenew),
    onSuccess: (r) => {
      if (r.url) window.location.href = r.url; // Stripe-hosted checkout
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not start checkout'),
  });
  const option = (value: boolean, title: string, detail: string, methods: string) => {
    const on = autoRenew === value;
    return (
      <div
        role="radio"
        aria-checked={on}
        tabIndex={0}
        onClick={() => setAutoRenew(value)}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setAutoRenew(value)}
        style={{
          border: `1.5px solid ${on ? p.primary : p.border}`,
          background: on ? p.primarySoft : 'transparent',
          borderRadius: 12,
          padding: 14,
          cursor: 'pointer',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Radio checked={on} style={{ pointerEvents: 'none' }} />
          <Typography.Text strong>{title}</Typography.Text>
        </div>
        <div style={{ marginTop: 4, marginLeft: 24, color: p.textSecondary, fontSize: 13 }}>{detail}</div>
        <div style={{ marginTop: 8, marginLeft: 24, fontSize: 12, color: p.textTertiary }}>{methods}</div>
      </div>
    );
  };
  return (
    <Modal
      open={plan !== null}
      title={`${PLANS.find((x) => x.id === plan)?.name ?? ''} plan — ${plan ? PRICE_BY_PLAN[plan] : ''}/month`}
      okText="Continue to payment"
      confirmLoading={checkout.isPending}
      onOk={() => checkout.mutate()}
      onCancel={onClose}
    >
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {option(
          true,
          'Monthly, auto-renew',
          'Charged automatically each month so you never lose access. Turn it off any time.',
          'Visa / Mastercard · Apple Pay',
        )}
        {option(
          false,
          'Pay once for 30 days',
          "No automatic charge — we'll remind you before it ends.",
          'FPX online banking · Visa / Mastercard · Apple Pay',
        )}
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          <LockOutlined /> Payments are processed securely by Stripe. MyTax never sees or stores your card or bank details.
        </Typography.Text>
      </Space>
    </Modal>
  );
}

export default function Billing() {
  const queryClient = useQueryClient();
  const { palette: p } = useTheme();
  const [choosing, setChoosing] = useState<string | null>(null);
  const { data: current, refetch } = useQuery({ queryKey: ['subscription'], queryFn: getSubscription });
  const { data: payments } = useQuery({ queryKey: ['payments'], queryFn: listPayments });

  // Back from Stripe Checkout. Activation comes from Stripe's webhook, so poll briefly until it lands.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const result = params.get('checkout');
    if (!result) return;
    window.history.replaceState({}, '', '/billing');
    if (result === 'cancelled') {
      message.warning('Checkout cancelled — you were not charged.');
      return;
    }
    message.success('Payment received — activating your plan…');
    let tries = 0;
    const timer = setInterval(() => {
      tries += 1;
      ['subscription', 'payments', 'usage', 'me'].forEach((k) => queryClient.invalidateQueries({ queryKey: [k] }));
      if (tries >= 6) clearInterval(timer);
    }, 2500);
    return () => clearInterval(timer);
  }, [queryClient]);

  const autoRenew = useMutation({
    mutationFn: setAutoRenew,
    onSuccess: (r, enabled) => {
      if (r.url) {
        window.location.href = r.url; // one-off plan: save a card for renewal at period end
        return;
      }
      message.success(enabled ? 'Auto-renew is on' : "Auto-renew is off — your plan won't be charged again");
      refetch();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not change auto-renew'),
  });
  const portal = useMutation({
    mutationFn: openBillingPortal,
    onSuccess: (r) => {
      if (r.url) window.location.href = r.url;
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not open billing settings'),
  });

  const currentPlan = current?.status === 'ACTIVE' ? current.plan : null;
  const ends = current?.periodEnd ? dayjs(current.periodEnd).format('D MMM YYYY') : null;

  return (
    <Page title="Billing" subtitle="Your plan, AI allowance and payment history.">
      <Card title="Current plan">
        {currentPlan && current ? (
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Space wrap>
                <Typography.Text strong style={{ fontSize: 18 }}>
                  {current.planName}
                </Typography.Text>
                <StatusTag status="ACTIVE" />
              </Space>
              <div style={{ color: p.textSecondary, marginTop: 4 }}>
                {formatRM(current.amountCents / 100)}/month
                {ends && (current.autoRenew ? ` · renews on ${ends}` : ` · ends on ${ends}`)}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <Switch
                checked={current.autoRenew}
                loading={autoRenew.isPending}
                onChange={(on) => autoRenew.mutate(on)}
                aria-label="Auto-renew"
              />
              <div>
                <div style={{ fontWeight: 500 }}>Auto-renew</div>
                <div style={{ fontSize: 12, color: p.textSecondary }}>
                  {current.autoRenew
                    ? current.renewalScheduled
                      ? `Your card will be charged on ${ends} to continue.`
                      : 'Charged automatically each month (card / Apple Pay).'
                    : "Off — we'll remind you before your plan ends."}
                </div>
              </div>
            </div>
            {current.canManageBilling && (
              <Button icon={<CreditCardOutlined />} loading={portal.isPending} onClick={() => portal.mutate()}>
                Manage payment method &amp; invoices
              </Button>
            )}
          </Space>
        ) : (
          <Space direction="vertical" size="small">
            <Space>
              <Typography.Text strong style={{ fontSize: 18 }}>
                Free
              </Typography.Text>
              <Tag color="success">Current</Tag>
            </Space>
            <Typography.Text type="secondary">AI allowance ≈ 2 documents / day · upgrade any time for more</Typography.Text>
          </Space>
        )}
      </Card>

      <Card title={currentPlan ? 'Change plan' : 'Plans'}>
        <PlanCards currentPlan={currentPlan} onChoose={setChoosing} pendingPlan={null} />
      </Card>

      <PayModal plan={choosing} onClose={() => setChoosing(null)} />

      <Card title="Ways to pay">
        <Space wrap size={[8, 8]}>
          <Tag style={{ padding: '4px 10px', fontSize: 13 }}>FPX online banking</Tag>
          <Tag style={{ padding: '4px 10px', fontSize: 13 }}>Visa / Mastercard</Tag>
          <Tag style={{ padding: '4px 10px', fontSize: 13 }}>Apple Pay</Tag>
          <Tag style={{ padding: '4px 10px', fontSize: 13 }}>Auto-renew (card / Apple Pay)</Tag>
        </Space>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '10px 0 0' }}>
          <LockOutlined /> Processed securely by Stripe — MyTax never stores card or bank details. FPX is for one-off payments;
          auto-renew needs a card or Apple Pay.
        </Typography.Paragraph>
      </Card>

      <ReferralCard />

      <Card title="Payment history">
        <Table
          rowKey="id"
          dataSource={payments ?? []}
          pagination={{ pageSize: 10, hideOnSinglePage: true }}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No payments yet' }}
          columns={[
            { title: 'Date', dataIndex: 'paidAt', render: (v: string) => dayjs(v).format('D MMM YYYY') },
            { title: 'Description', dataIndex: 'description' },
            { title: 'Amount', dataIndex: 'amountCents', render: (v: number) => formatRM(v / 100) },
            {
              title: 'Receipt',
              key: 'receipt',
              render: (_: unknown, r: PaymentRecord) =>
                r.receiptUrl ? (
                  <a href={r.receiptUrl} target="_blank" rel="noreferrer">
                    View
                  </a>
                ) : (
                  <Typography.Text type="secondary">{r.provider === 'BILLPLZ' ? 'FPX (Billplz)' : '—'}</Typography.Text>
                ),
            },
          ]}
        />
      </Card>
    </Page>
  );
}
