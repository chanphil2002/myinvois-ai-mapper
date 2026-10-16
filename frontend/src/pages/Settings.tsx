import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useMe } from '../hooks/useMe';
import { Button, Card, Col, Form, Input, Modal, Row, Segmented, Select, Space, Switch, Tabs, Tag, Tooltip, Typography, message } from 'antd';
import {
  BulbOutlined,
  CrownOutlined,
  EditOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
  LogoutOutlined,
  QuestionCircleOutlined,
  RightOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBusinessProfile,
  getCredentials,
  revealCredentials,
  saveBusinessProfile,
  saveCredentials,
  setActiveEnvironment,
} from '../api/endpoints';
import type { BusinessProfile, CredentialResponse, MyInvoisEnvironment, RevealedCredentialResponse } from '../api/types';
import { useTheme } from '../theme/ThemeContext';
import Page from '../components/Page';
import { MALAYSIA_STATE_CODES } from '../constants/malaysiaStates';

const SECRET_MASK = '••••••••••••';
const maskKey = (v: string) => (v.length > 6 ? `${v.slice(0, 3)}••••${v.slice(-2)}` : '••••');

interface CredentialForm {
  clientId: string;
  clientSecret: string;
}

const ENV_LABEL: Record<MyInvoisEnvironment, string> = { SANDBOX: 'Sandbox', PRODUCTION: 'Production' };

/** One environment's App Key / Secret: masked by default, password-gated reveal and edit. */
function EnvironmentCredentials({
  environment,
  existing,
  loading,
}: {
  environment: MyInvoisEnvironment;
  existing: CredentialResponse | null;
  loading: boolean;
}) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CredentialForm>();
  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCredentialResponse | null>(null);
  const [pw, setPw] = useState('');
  const [pwIntent, setPwIntent] = useState<'reveal' | 'edit' | null>(null);

  const showDisplay = (r: RevealedCredentialResponse | null) => {
    form.setFieldsValue({
      clientId: r ? r.clientId : existing ? maskKey(existing.clientId) : '',
      clientSecret: r ? r.clientSecret : existing ? SECRET_MASK : '',
    });
  };

  useEffect(() => {
    if (loading) return;
    if (!existing) {
      setEditing(true);
      form.resetFields();
    } else if (!editing) {
      showDisplay(revealed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, loading]);

  const saveMutation = useMutation({
    mutationFn: (values: CredentialForm) => saveCredentials({ ...values, environment }),
    onSuccess: (data, vars) => {
      message.success(`${ENV_LABEL[environment]} credentials saved`);
      setRevealed({ clientId: vars.clientId, clientSecret: vars.clientSecret, environment });
      setEditing(false);
      queryClient.setQueryData(['myinvois-credentials'], data);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to save credentials'),
  });

  const revealMutation = useMutation({
    mutationFn: () => revealCredentials({ password: pw, environment }),
    onSuccess: (data) => {
      setRevealed(data);
      const intent = pwIntent;
      setPwIntent(null);
      setPw('');
      if (intent === 'edit') {
        form.setFieldsValue(data);
        setEditing(true);
      } else {
        showDisplay(data);
      }
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Wrong password'),
  });

  const onReveal = () => {
    if (revealed) {
      setRevealed(null);
      showDisplay(null);
    } else {
      setPwIntent('reveal');
    }
  };

  const onEdit = () => {
    if (revealed) {
      form.setFieldsValue(revealed);
      setEditing(true);
    } else {
      setPwIntent('edit');
    }
  };

  const onCancel = () => {
    setEditing(false);
    showDisplay(revealed);
  };

  const firstTime = !loading && !existing;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          {firstTime
            ? `Not set up yet — paste the ${ENV_LABEL[environment].toLowerCase()} App Key and Secret issued by LHDN.`
            : `${ENV_LABEL[environment]} App Key and Secret issued by LHDN.`}
        </Typography.Text>
        {!firstTime && !editing && (
          <Space size={2}>
            <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
              <Button type="text" icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={onReveal} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} onClick={onEdit} />
            </Tooltip>
          </Space>
        )}
      </div>

      <Form form={form} layout="vertical" onFinish={(v) => saveMutation.mutate(v)} disabled={!editing}>
        <Form.Item name="clientId" label="App Key (client_id)" rules={editing ? [{ required: true }] : []}>
          <Input placeholder="App Key" />
        </Form.Item>
        <Form.Item name="clientSecret" label="App Secret (client_secret)" rules={editing ? [{ required: true }] : []}>
          <Input placeholder="App Secret" />
        </Form.Item>
        {editing && (
          <Space>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              Save {ENV_LABEL[environment].toLowerCase()} credentials
            </Button>
            {!firstTime && <Button onClick={onCancel}>Cancel</Button>}
          </Space>
        )}
      </Form>

      <Modal
        title={pwIntent === 'edit' ? 'Confirm password to edit' : 'Confirm password to reveal'}
        open={pwIntent !== null}
        onOk={() => revealMutation.mutate()}
        confirmLoading={revealMutation.isPending}
        okText="Confirm"
        onCancel={() => {
          setPwIntent(null);
          setPw('');
        }}
      >
        <Typography.Paragraph type="secondary">
          Re-enter your account password to {pwIntent === 'edit' ? 'edit your' : 'view the stored'}{' '}
          {ENV_LABEL[environment].toLowerCase()} credentials.
        </Typography.Paragraph>
        <Input.Password
          value={pw}
          placeholder="Account password"
          onChange={(e) => setPw(e.target.value)}
          onPressEnter={() => revealMutation.mutate()}
        />
      </Modal>
    </>
  );
}

/**
 * Sandbox and production credentials side by side (LHDN issues them separately), plus the switch
 * for which environment new submissions go to.
 */
function MyInvoisCredentialsCard() {
  const queryClient = useQueryClient();
  const { palette } = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ['myinvois-credentials'], queryFn: getCredentials, retry: false });
  const active = data?.activeEnvironment ?? 'SANDBOX';
  const [tab, setTab] = useState<MyInvoisEnvironment | null>(null);

  const activate = useMutation({
    mutationFn: setActiveEnvironment,
    onSuccess: (res) => {
      queryClient.setQueryData(['myinvois-credentials'], res);
      message.success(`New submissions now go to ${ENV_LABEL[res.activeEnvironment]}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not switch environment'),
  });

  const onSwitch = (env: MyInvoisEnvironment) => {
    if (env === active) return;
    if (env === 'PRODUCTION') {
      Modal.confirm({
        title: 'Submit to Production?',
        content:
          'New e-invoices will be sent to LHDN’s live MyInvois system and become legally issued documents. Invoices already submitted keep their original environment.',
        okText: 'Switch to Production',
        okButtonProps: { danger: true },
        onOk: () => activate.mutateAsync('PRODUCTION'),
      });
    } else {
      activate.mutate(env);
    }
  };

  const envs: MyInvoisEnvironment[] = ['SANDBOX', 'PRODUCTION'];
  const credFor = (env: MyInvoisEnvironment) => (env === 'SANDBOX' ? data?.sandbox : data?.production) ?? null;

  return (
    <Card title="API Credentials" style={{ height: '100%' }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 6 }}>
        Submit new invoices to
      </Typography.Text>
      <Segmented
        block
        value={active}
        onChange={(v) => onSwitch(v as MyInvoisEnvironment)}
        options={envs.map((env) => ({
          value: env,
          disabled: !credFor(env) || activate.isPending,
          label: (
            <Tooltip title={credFor(env) ? undefined : `Add ${ENV_LABEL[env].toLowerCase()} credentials first`}>
              <span>{ENV_LABEL[env]}</span>
            </Tooltip>
          ),
        }))}
      />
      <Typography.Text
        style={{ fontSize: 12, display: 'block', marginTop: 6, color: active === 'PRODUCTION' ? palette.warning : palette.textSecondary }}
      >
        {active === 'PRODUCTION'
          ? 'Live: submissions are real e-invoices issued to LHDN.'
          : 'Testing: submissions go to LHDN’s preprod sandbox.'}
      </Typography.Text>

      <Tabs
        style={{ marginTop: 12 }}
        size="small"
        tabBarGutter={24}
        activeKey={tab ?? active}
        onChange={(k) => setTab(k as MyInvoisEnvironment)}
        items={envs.map((env) => ({
          key: env,
          label: (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              {ENV_LABEL[env]}
              {env === active && (
                <Tooltip title="Active — new submissions go here">
                  <span
                    aria-label="Active"
                    style={{ width: 7, height: 7, borderRadius: '50%', background: palette.success, display: 'inline-block' }}
                  />
                </Tooltip>
              )}
            </span>
          ),
          children: <EnvironmentCredentials environment={env} existing={credFor(env)} loading={isLoading} />,
        }))}
      />
    </Card>
  );
}

function BusinessProfileCard() {
  const queryClient = useQueryClient();
  const { data: existing, isLoading } = useQuery({
    queryKey: ['business-profile'],
    queryFn: getBusinessProfile,
    retry: false,
  });

  const [editing, setEditing] = useState(false);
  const [form] = Form.useForm<BusinessProfile>();

  const mutation = useMutation({
    mutationFn: saveBusinessProfile,
    onSuccess: () => {
      message.success('Business profile saved');
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['business-profile'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to save business profile'),
  });

  useEffect(() => {
    if (existing) form.setFieldsValue(existing);
    // First-time setup (no saved profile yet): open the form straight away.
    if (!isLoading && !existing) setEditing(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, isLoading]);

  const onFinish = (values: BusinessProfile) => mutation.mutate(values);
  const onCancel = () => {
    if (existing) form.setFieldsValue(existing);
    setEditing(false);
  };

  // Three-across on desktop so the profile scales horizontally (stays short), not down the page.
  const col = { xs: 24, sm: 12, lg: 8 } as const;
  const firstTime = !isLoading && !existing;

  return (
    <Card
      title="Business Profile"
      style={{ height: '100%' }}
      extra={
        !editing && !firstTime ? (
          <Button icon={<EditOutlined />} onClick={() => setEditing(true)}>
            Edit Profile
          </Button>
        ) : null
      }
    >
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Your own registration details as the supplier on every e-Invoice — set once here, not re-guessed by the
        AI from each uploaded document.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        disabled={!editing}
        initialValues={{ idType: 'NRIC', countryCode: 'MYS', defaultSubmissionMode: 'INDIVIDUAL' }}
      >
        {/* Kept so the backend still receives a value; the create flow is type-first now. */}
        <Form.Item name="defaultSubmissionMode" hidden>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col {...col}>
            <Form.Item name="registrationName" label="Registration name" rules={[{ required: true }]}>
              <Input placeholder="Legal / registered name" />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="tin" label="TIN" rules={[{ required: true }]}>
              <Input placeholder="e.g. IG50974019070" />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="idType" label="ID type" rules={[{ required: true }]}>
              <Select
                options={[
                  { value: 'NRIC', label: 'NRIC (individual)' },
                  { value: 'BRN', label: 'BRN (company)' },
                  { value: 'PASSPORT', label: 'Passport' },
                  { value: 'ARMY', label: 'Army ID' },
                ]}
              />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="idValue" label="ID number" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="sstRegistration" label="SST registration">
              <Input placeholder="NA if none" />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="ttxRegistration" label="Tourism tax">
              <Input placeholder="NA if none" />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="msicCode" label="MSIC code">
              <Input placeholder="e.g. 47411" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12} lg={16}>
            <Form.Item name="msicDescription" label="MSIC description">
              <Input placeholder="e.g. Retail sale of computers in specialised stores" />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="addressLine1" label="Address line 1">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24}>
            <Form.Item name="addressLine2" label="Address line 2">
              <Input />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="postalZone" label="Postcode">
              <Input />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="stateCode" label="State">
              <Select options={MALAYSIA_STATE_CODES} showSearch optionFilterProp="label" />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="countryCode" label="Country">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
          </Col>
          <Col {...col}>
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        {editing && (
          <Space>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Save business profile
            </Button>
            {!firstTime && <Button onClick={onCancel}>Cancel</Button>}
          </Space>
        )}
      </Form>
    </Card>
  );
}

/** Signed-in account: help, appearance and sign-out (on phones this is the only place to log out). */
function AccountCard() {
  const { email, logout } = useAuth();
  const { isAdmin } = useMe();
  const { isDark, toggle, palette } = useTheme();
  const navigate = useNavigate();
  const row = (icon: ReactNode, label: ReactNode, extra: ReactNode, onClick?: () => void, danger = false) => (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => onClick && (e.key === 'Enter' || e.key === ' ') && onClick()}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        minHeight: 52,
        padding: '4px 0',
        cursor: onClick ? 'pointer' : 'default',
        borderTop: `1px solid ${palette.border}`,
        color: danger ? palette.error : undefined,
      }}
    >
      <span style={{ fontSize: 18, width: 22, textAlign: 'center', color: danger ? palette.error : palette.textSecondary }}>
        {icon}
      </span>
      <span style={{ flex: 1, minWidth: 0, fontWeight: 500 }}>{label}</span>
      {extra}
    </div>
  );
  return (
    <Card title="Account">
      <div style={{ paddingBottom: 12 }}>
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          Signed in as
        </Typography.Text>
        <div style={{ fontWeight: 600, overflowWrap: 'anywhere' }}>{email}</div>
      </div>
      {/* The whole row toggles, not just the small switch. */}
      {row(
        <BulbOutlined />,
        'Dark mode',
        <Switch checked={isDark} aria-label="Dark mode" style={{ pointerEvents: 'none' }} />,
        toggle,
      )}
      {row(<QuestionCircleOutlined />, 'Help & support', <RightOutlined style={{ color: palette.textTertiary }} />, () =>
        navigate('/support'),
      )}
      {isAdmin &&
        row(<CrownOutlined />, 'Admin console', <RightOutlined style={{ color: palette.textTertiary }} />, () =>
          navigate('/admin'),
        )}
      {row(<LogoutOutlined />, 'Log out', null, logout, true)}
    </Card>
  );
}

export default function Settings() {
  return (
    <Page title="Settings" subtitle="Your LHDN API credentials, the supplier details printed on every e-invoice, and your account.">
      {/* Credentials and Business Profile stretch to the same height. */}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={9}>
          <MyInvoisCredentialsCard />
        </Col>
        <Col xs={24} lg={15}>
          <BusinessProfileCard />
        </Col>
      </Row>
      <AccountCard />
    </Page>
  );
}
