import { useState } from 'react';
import {
  Button,
  Card,
  Col,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import { CopyOutlined, PlusOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import dayjs from 'dayjs';
import { adminApi } from '../api/endpoints';
import type { AdminUserRow, CommissionRow, ReferralCodeRow, SalespersonRow } from '../api/types';
import Page from '../components/Page';
import { formatRM } from '../utils/money';
import { useMe } from '../hooks/useMe';
import { useTheme } from '../theme/ThemeContext';

const sen = (cents: number) => formatRM(cents / 100);
const date = (iso: string | null) => (iso ? dayjs(iso).format('D MMM YYYY') : '—');
const onErr = (fallback: string) => (err: unknown) => message.error(err instanceof Error ? err.message : fallback);

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  const { palette: p } = useTheme();
  return (
    <Card size="small" style={{ height: '100%' }}>
      <div style={{ fontSize: 12, color: p.textSecondary }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, lineHeight: 1.3 }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: p.textTertiary }}>{hint}</div>}
    </Card>
  );
}

function OverviewTab() {
  const { data } = useQuery({ queryKey: ['admin', 'overview'], queryFn: adminApi.overview });
  if (!data) return null;
  return (
    <Row gutter={[12, 12]}>
      <Col xs={12} md={6}>
        <Stat label="Users" value={data.totalUsers} hint={`${data.newUsers30d} new in 30 days`} />
      </Col>
      <Col xs={12} md={6}>
        <Stat label="Paying" value={data.payingUsers} hint={`${data.totalUsers - data.activeUsers} blocked`} />
      </Col>
      <Col xs={12} md={6}>
        <Stat label="Monthly revenue" value={sen(data.monthlyRevenueCents)} hint="active plans" />
      </Col>
      <Col xs={12} md={6}>
        <Stat label="AI cost this month" value={`$${Number(data.aiCostThisMonthUsd).toFixed(2)}`} hint="metered Gemini usage" />
      </Col>
      <Col xs={12} md={6}>
        <Stat label="Commission owed" value={sen(data.pendingCommissionCents)} hint="pending payout" />
      </Col>
      <Col xs={12} md={6}>
        <Stat label="Commission paid" value={sen(data.paidCommissionCents)} />
      </Col>
      <Col xs={24} md={12}>
        <Card size="small" style={{ height: '100%' }}>
          <div style={{ fontSize: 12, marginBottom: 8 }}>Users by plan</div>
          <Space wrap>
            {Object.entries(data.usersByPlan).map(([plan, n]) => (
              <Tag key={plan} style={{ fontSize: 13, padding: '2px 10px' }}>
                {plan}: <strong>{n}</strong>
              </Tag>
            ))}
          </Space>
        </Card>
      </Col>
    </Row>
  );
}

function UsersTab() {
  const queryClient = useQueryClient();
  const { me } = useMe();
  const [q, setQ] = useState('');
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'users', q], queryFn: () => adminApi.users(q || undefined) });
  const update = useMutation({
    mutationFn: ({ id, body }: { id: number; body: { active?: boolean; role?: 'OWNER' | 'ADMIN' } }) =>
      adminApi.updateUser(id, body),
    onSuccess: () => {
      message.success('Updated');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: onErr('Update failed'),
  });

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Input.Search placeholder="Search email or company" allowClear onSearch={setQ} style={{ maxWidth: 360 }} />
      <Table<AdminUserRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          {
            title: 'User',
            key: 'user',
            render: (_, u) => (
              <div>
                <div style={{ fontWeight: 600 }}>{u.companyName}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {u.email}
                </Typography.Text>
              </div>
            ),
          },
          {
            title: 'Plan',
            key: 'plan',
            render: (_, u) => (
              <div>
                <Tag color={u.plan === 'free' ? undefined : 'success'}>{u.plan}</Tag>
                {u.planEndsAt && (
                  <div style={{ fontSize: 12 }}>
                    {u.autoRenew ? 'renews' : 'ends'} {date(u.planEndsAt)}
                  </div>
                )}
              </div>
            ),
          },
          {
            title: 'Referred by',
            key: 'ref',
            render: (_, u) => (u.referralCode ? `${u.salesperson ?? '—'} (${u.referralCode})` : '—'),
          },
          { title: 'Joined', dataIndex: 'createdAt', render: date },
          {
            title: 'Admin',
            key: 'role',
            render: (_, u) => (
              <Switch
                checked={u.role === 'ADMIN'}
                disabled={u.id === me?.userId}
                onChange={(on) => update.mutate({ id: u.id, body: { role: on ? 'ADMIN' : 'OWNER' } })}
              />
            ),
          },
          {
            title: 'Active',
            key: 'active',
            render: (_, u) => (
              <Switch
                checked={u.active}
                disabled={u.id === me?.userId}
                onChange={(on) => update.mutate({ id: u.id, body: { active: on } })}
              />
            ),
          },
        ]}
      />
    </Space>
  );
}

function SalespeopleTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SalespersonRow | 'new' | null>(null);
  const [form] = Form.useForm();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'salespeople'], queryFn: adminApi.salespeople });
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const save = useMutation({
    mutationFn: (values: { name: string; email?: string; phone?: string; commissionPercent: number }) =>
      editing === 'new' ? adminApi.createSalesperson(values) : adminApi.updateSalesperson((editing as SalespersonRow).id, values),
    onSuccess: () => {
      message.success('Saved');
      setEditing(null);
      refresh();
    },
    onError: onErr('Save failed'),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => adminApi.updateSalesperson(id, { active }),
    onSuccess: refresh,
    onError: onErr('Update failed'),
  });
  const newCode = useMutation({
    mutationFn: (salespersonId: number) => adminApi.createCode({ salespersonId }),
    onSuccess: (r) => {
      message.success(`Code ${r.code} created`);
      refresh();
    },
    onError: onErr('Could not create a code'),
  });

  const open = (row: SalespersonRow | 'new') => {
    setEditing(row);
    form.setFieldsValue(row === 'new' ? { name: '', email: '', phone: '', commissionPercent: 10 } : row);
  };

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Button type="primary" icon={<PlusOutlined />} onClick={() => open('new')}>
        Add salesperson
      </Button>
      <Table<SalespersonRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={false}
        columns={[
          {
            title: 'Salesperson',
            key: 'name',
            render: (_, s) => (
              <div>
                <div style={{ fontWeight: 600 }}>{s.name}</div>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {[s.email, s.phone].filter(Boolean).join(' · ') || '—'}
                </Typography.Text>
              </div>
            ),
          },
          { title: 'Commission', dataIndex: 'commissionPercent', render: (v: number) => `${v}% of every payment` },
          {
            title: 'Codes',
            key: 'codes',
            render: (_, s) => (
              <Space wrap size={4}>
                {s.codes.map((c) => (
                  <Tag key={c}>{c}</Tag>
                ))}
                <Button size="small" type="link" loading={newCode.isPending} onClick={() => newCode.mutate(s.id)}>
                  + code
                </Button>
              </Space>
            ),
          },
          { title: 'Referred', key: 'ref', render: (_, s) => `${s.referredUsers} (${s.payingUsers} paying)` },
          { title: 'Owed', dataIndex: 'pendingCents', render: sen },
          { title: 'Paid out', dataIndex: 'paidCents', render: sen },
          {
            title: 'Active',
            key: 'active',
            render: (_, s) => (
              <Switch checked={s.active} onChange={(active) => toggle.mutate({ id: s.id, active })} />
            ),
          },
          { title: '', key: 'edit', render: (_, s) => <Button size="small" onClick={() => open(s)}>Edit</Button> },
        ]}
      />
      <Modal
        open={editing !== null}
        title={editing === 'new' ? 'Add salesperson' : 'Edit salesperson'}
        okText="Save"
        confirmLoading={save.isPending}
        onOk={() => form.submit()}
        onCancel={() => setEditing(null)}
      >
        <Form form={form} layout="vertical" onFinish={(v) => save.mutate(v)} requiredMark={false}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email">
            <Input type="email" inputMode="email" />
          </Form.Item>
          <Form.Item name="phone" label="Phone">
            <Input inputMode="tel" />
          </Form.Item>
          <Form.Item
            name="commissionPercent"
            label="Commission (% of every payment by referred users)"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} max={100} step={0.5} addonAfter="%" style={{ width: '100%' }} />
          </Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function CodesTab() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['admin', 'codes'], queryFn: adminApi.codes });
  const { data: people } = useQuery({ queryKey: ['admin', 'salespeople'], queryFn: adminApi.salespeople });
  const [salespersonId, setSalespersonId] = useState<number>();
  const [custom, setCustom] = useState('');
  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin'] });

  const create = useMutation({
    mutationFn: () => adminApi.createCode({ salespersonId: salespersonId!, code: custom.trim() || undefined }),
    onSuccess: (r) => {
      message.success(`Code ${r.code} created`);
      setCustom('');
      refresh();
    },
    onError: onErr('Could not create the code'),
  });
  const toggle = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => adminApi.updateCode(id, { active }),
    onSuccess: refresh,
    onError: onErr('Update failed'),
  });

  const signupLink = (code: string) => `${window.location.origin}/register?ref=${encodeURIComponent(code)}`;

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Card size="small" title="New referral code">
        <Space wrap>
          <Select
            placeholder="Salesperson"
            style={{ minWidth: 200 }}
            value={salespersonId}
            onChange={setSalespersonId}
            options={(people ?? []).filter((p) => p.active).map((p) => ({ value: p.id, label: p.name }))}
          />
          <Input
            placeholder="Custom code (optional)"
            value={custom}
            onChange={(e) => setCustom(e.target.value.toUpperCase())}
            style={{ width: 220 }}
          />
          <Button type="primary" disabled={!salespersonId} loading={create.isPending} onClick={() => create.mutate()}>
            Create
          </Button>
        </Space>
        <Typography.Paragraph type="secondary" style={{ fontSize: 12, margin: '8px 0 0' }}>
          Leave the code blank to generate one (e.g. AMIRHA-R7MH). Share the sign-up link — the code is filled in for the
          customer.
        </Typography.Paragraph>
      </Card>
      <Table<ReferralCodeRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          { title: 'Code', dataIndex: 'code', render: (c: string) => <Typography.Text strong copyable>{c}</Typography.Text> },
          { title: 'Salesperson', dataIndex: 'salesperson' },
          { title: 'Sign-ups', dataIndex: 'signups' },
          { title: 'Created', dataIndex: 'createdAt', render: date },
          {
            title: 'Sign-up link',
            key: 'link',
            render: (_, c) => (
              <Tooltip title={signupLink(c.code)}>
                <Button
                  size="small"
                  icon={<CopyOutlined />}
                  onClick={() => navigator.clipboard.writeText(signupLink(c.code)).then(() => message.success('Link copied'))}
                >
                  Copy link
                </Button>
              </Tooltip>
            ),
          },
          {
            title: 'Active',
            key: 'active',
            render: (_, c) => <Switch checked={c.active} onChange={(active) => toggle.mutate({ id: c.id, active })} />,
          },
        ]}
      />
    </Space>
  );
}

function CommissionsTab() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'PENDING' | 'PAID' | 'ALL'>('PENDING');
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'commissions', status],
    queryFn: () => adminApi.commissions(status === 'ALL' ? undefined : status),
  });
  const pay = useMutation({
    mutationFn: adminApi.markCommissionPaid,
    onSuccess: () => {
      message.success('Marked as paid');
      queryClient.invalidateQueries({ queryKey: ['admin'] });
    },
    onError: onErr('Update failed'),
  });
  const total = (data ?? []).reduce((s, c) => s + c.amountCents, 0);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      <Space wrap align="center">
        <Segmented
          value={status}
          onChange={(v) => setStatus(v as typeof status)}
          options={[
            { value: 'PENDING', label: 'Owed' },
            { value: 'PAID', label: 'Paid' },
            { value: 'ALL', label: 'All' },
          ]}
        />
        <Typography.Text type="secondary">Total: {sen(total)}</Typography.Text>
      </Space>
      <Table<CommissionRow>
        rowKey="id"
        loading={isLoading}
        dataSource={data ?? []}
        size="small"
        scroll={{ x: 'max-content' }}
        pagination={{ pageSize: 20, hideOnSinglePage: true }}
        columns={[
          { title: 'Date', dataIndex: 'createdAt', render: date },
          { title: 'Salesperson', dataIndex: 'salesperson' },
          { title: 'Customer', dataIndex: 'userEmail' },
          { title: 'Payment', dataIndex: 'paymentAmountCents', render: sen },
          { title: 'Rate', dataIndex: 'percent', render: (v: number) => `${v}%` },
          { title: 'Commission', dataIndex: 'amountCents', render: (v: number) => <strong>{sen(v)}</strong> },
          {
            title: 'Status',
            key: 'status',
            render: (_, c) =>
              c.status === 'PAID' ? (
                <Tag color="success">Paid {date(c.paidAt)}</Tag>
              ) : (
                <Button size="small" loading={pay.isPending && pay.variables === c.id} onClick={() => pay.mutate(c.id)}>
                  Mark paid
                </Button>
              ),
          },
        ]}
      />
    </Space>
  );
}

/** Admin console (role ADMIN only — the API enforces it too). */
export default function Admin() {
  const { me } = useMe();
  const [params, setParams] = useSearchParams();
  const tab = params.get('tab') ?? 'overview';

  if (me && me.role !== 'ADMIN') {
    return (
      <Page title="Admin">
        <Typography.Text type="secondary">You don't have access to the admin console.</Typography.Text>
      </Page>
    );
  }

  return (
    <Page title="Admin console" subtitle="Platform overview, users, salespeople, referral codes and commissions.">
      <Card>
        <Tabs
          activeKey={tab}
          onChange={(k) => setParams(k === 'overview' ? {} : { tab: k })}
          items={[
            { key: 'overview', label: 'Overview', children: <OverviewTab /> },
            { key: 'users', label: 'Users', children: <UsersTab /> },
            { key: 'salespeople', label: 'Salespeople', children: <SalespeopleTab /> },
            { key: 'codes', label: 'Referral codes', children: <CodesTab /> },
            { key: 'commissions', label: 'Commissions', children: <CommissionsTab /> },
          ]}
        />
      </Card>
    </Page>
  );
}
