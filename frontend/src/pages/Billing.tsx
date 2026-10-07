import { useState } from 'react';
import { Button, Card, Col, Row, Space, Table, Tag, Typography, message } from 'antd';
import { CheckCircleTwoTone } from '@ant-design/icons';

type PlanId = 'beginner' | 'heavy' | 'elite';

interface Plan {
  id: PlanId;
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

const PLAN_KEY = 'mytax_billing_plan';

function loadPlan(): PlanId | null {
  try {
    const v = localStorage.getItem(PLAN_KEY);
    return v === 'beginner' || v === 'heavy' || v === 'elite' ? v : null;
  } catch {
    return null;
  }
}

function PlanCards({ current, onChoose }: { current: PlanId | null; onChoose: (id: PlanId) => void }) {
  return (
    <Row gutter={[16, 16]}>
      {PLANS.map((p) => {
        const isCurrent = p.id === current;
        return (
          <Col xs={24} md={8} key={p.id}>
            <Card
              style={{ height: '100%', borderColor: p.popular ? '#0958d9' : undefined }}
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
                onClick={() => onChoose(p.id)}
              >
                {isCurrent ? 'Current plan' : current ? 'Switch to this plan' : 'Subscribe'}
              </Button>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
}

export default function Billing() {
  const [plan, setPlan] = useState<PlanId | null>(loadPlan());
  const current = PLANS.find((p) => p.id === plan) ?? null;

  const choose = (id: PlanId) => {
    try {
      localStorage.setItem(PLAN_KEY, id);
    } catch {
      /* storage unavailable — keep in-memory only */
    }
    setPlan(id);
    message.success(`Subscribed to ${PLANS.find((p) => p.id === id)?.name}`);
  };

  const cancel = () => {
    try {
      localStorage.removeItem(PLAN_KEY);
    } catch {
      /* ignore */
    }
    setPlan(null);
    message.info('Subscription cancelled');
  };

  // Mock history — a subscribed account shows one sample paid invoice for its current plan.
  const pastInvoices = current
    ? [{ key: '1', invoice: 'INV-2026-0001', date: '2026-10-01', plan: current.name, amount: `${current.price}`, status: 'Paid' }]
    : [];

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Typography.Title level={3} style={{ marginBottom: 0 }}>
        Billing
      </Typography.Title>

      <Card title="Current Plan">
        {current ? (
          <Space direction="vertical" size="small">
            <Space>
              <Typography.Text strong style={{ fontSize: 18 }}>
                {current.name}
              </Typography.Text>
              <Tag color="green">Active</Tag>
            </Space>
            <Typography.Text type="secondary">
              {current.price}
              {current.period}
            </Typography.Text>
            <Button danger onClick={cancel} style={{ marginTop: 8 }}>
              Cancel subscription
            </Button>
          </Space>
        ) : (
          <>
            <Typography.Paragraph type="secondary">
              You're not subscribed yet. Choose a plan to get started.
            </Typography.Paragraph>
            <PlanCards current={plan} onChoose={choose} />
          </>
        )}
      </Card>

      {current && (
        <Card title="Change plan">
          <PlanCards current={plan} onChoose={choose} />
        </Card>
      )}

      <Card title="Payment Method">
        <Space direction="vertical">
          <Typography.Text type="secondary">No payment method on file.</Typography.Text>
          <Button onClick={() => message.info('Payment method setup is coming soon.')}>
            Add payment method
          </Button>
        </Space>
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
