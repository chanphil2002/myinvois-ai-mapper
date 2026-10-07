import { useEffect } from 'react';
import { Button, Card, Col, Row, Space, Table, Tag, Typography, message } from 'antd';
import { CheckCircleTwoTone } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getSubscription, subscribePlan } from '../api/endpoints';

interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  popular?: boolean;
}

const PLANS: Plan[] = [
  {
    id: 'beginner',
    name: 'Beginner User',
    price: 'RM 29',
    period: '/month',
    tagline: 'For individuals getting started',
    features: ['Individual & consolidated e-invoices', 'Submit to MyInvois', 'Email support'],
  },
  {
    id: 'heavy',
    name: 'Heavy User',
    price: 'RM 99',
    period: '/month',
    tagline: 'For growing businesses',
    features: ['Everything in Beginner', 'AI document mapping', 'Priority support'],
    popular: true,
  },
  {
    id: 'elite',
    name: 'Elite User',
    price: 'RM 299',
    period: '/month',
    tagline: 'For high-volume senders',
    features: ['Everything in Heavy', 'Bulk & API access', 'Dedicated support'],
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
  return (
    <Row gutter={[16, 16]}>
      {PLANS.map((p) => {
        const isCurrent = p.id === currentPlan;
        return (
          <Col xs={24} md={8} key={p.id}>
            <Card
              style={{ height: '100%', borderColor: p.popular ? '#3b5bdb' : undefined }}
              title={
                <Space>
                  {p.name}
                  {p.popular && <Tag color="blue">Popular</Tag>}
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
                    <CheckCircleTwoTone twoToneColor="#52c41a" />
                    <span>{f}</span>
                  </Space>
                ))}
              </Space>
              <Button
                type={p.popular ? 'primary' : 'default'}
                block
                disabled={isCurrent}
                loading={pendingPlan === p.id}
                onClick={() => onChoose(p.id)}
              >
                {isCurrent ? 'Current plan' : currentPlan ? 'Switch to this plan' : 'Subscribe'}
              </Button>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

export default function Billing() {
  const queryClient = useQueryClient();
  const { data: current } = useQuery({ queryKey: ['subscription'], queryFn: getSubscription });

  // When Billplz redirects the user back here after payment, acknowledge it and refresh. The actual
  // activation is driven by the server-to-server callback, so the status may briefly stay PENDING.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paid = params.get('billplz[paid]');
    if (paid !== null) {
      if (paid === 'true') {
        message.success('Payment received — your subscription will activate shortly.');
      } else {
        message.warning('Payment was not completed.');
      }
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
      window.history.replaceState({}, '', '/billing');
    }
  }, [queryClient]);

  const subscribeMutation = useMutation({
    mutationFn: subscribePlan,
    onSuccess: (res) => {
      // Hand off to Billplz's hosted payment page.
      window.location.href = res.paymentUrl;
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not start checkout'),
  });

  const currentPlan = current?.status === 'ACTIVE' ? current.plan : null;
  const pendingPlan = subscribeMutation.isPending ? (subscribeMutation.variables as string) : null;

  const pastInvoices =
    current?.status === 'ACTIVE'
      ? [
          {
            key: '1',
            invoice: 'INV-0001',
            date: current.paidAt ? current.paidAt.slice(0, 10) : '',
            plan: current.planName,
            amount: `RM ${(current.amountCents / 100).toFixed(2)}`,
            status: 'Paid',
          },
        ]
      : [];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Billing
      </Typography.Title>

      <Card title="Current Plan">
        {currentPlan ? (
          <Space direction="vertical" size="small">
            <Space>
              <Typography.Text strong style={{ fontSize: 18 }}>
                {current?.planName}
              </Typography.Text>
              <Tag color="green">Active</Tag>
            </Space>
            <Typography.Text type="secondary">
              RM {((current?.amountCents ?? 0) / 100).toFixed(2)}/month
            </Typography.Text>
          </Space>
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              You're not subscribed yet. Choose a plan to get started — you'll be taken to Billplz to pay.
            </Typography.Paragraph>
            <PlanCards currentPlan={currentPlan} onChoose={subscribeMutation.mutate} pendingPlan={pendingPlan} />
          </>
        )}
      </Card>

      {currentPlan && (
        <Card title="Change plan">
          <PlanCards currentPlan={currentPlan} onChoose={subscribeMutation.mutate} pendingPlan={pendingPlan} />
        </Card>
      )}

      <Card title="Payment Method">
        <Typography.Text type="secondary">
          Payments are handled securely by Billplz (FPX online banking) at checkout — no card details are
          stored here.
        </Typography.Text>
      </Card>

      <Card title="Past Invoices">
        <Table
          rowKey="key"
          dataSource={pastInvoices}
          pagination={false}
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No past invoices yet' }}
          columns={[
            { title: 'Invoice', dataIndex: 'invoice', key: 'invoice' },
            { title: 'Date', dataIndex: 'date', key: 'date' },
            { title: 'Plan', dataIndex: 'plan', key: 'plan' },
            { title: 'Amount', dataIndex: 'amount', key: 'amount' },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (s: string) => <Tag color="green">{s}</Tag>,
            },
          ]}
        />
      </Card>
    </Space>
  );
}
