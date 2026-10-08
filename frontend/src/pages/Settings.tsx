import { useEffect, useState } from 'react';
import { Button, Card, Col, Form, Input, Modal, Row, Segmented, Select, Space, Tooltip, Typography, message } from 'antd';
import { EyeInvisibleOutlined, EyeOutlined, EditOutlined, BulbOutlined, MoonOutlined } from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  getBusinessProfile,
  getCredentials,
  revealCredentials,
  saveBusinessProfile,
  saveCredentials,
} from '../api/endpoints';
import type { BusinessProfile, MyInvoisEnvironment, RevealedCredentialResponse } from '../api/types';
import { MALAYSIA_STATE_CODES } from '../constants/malaysiaStates';
import { useTheme } from '../theme/ThemeContext';

const SECRET_MASK = '••••••••••••';
const maskKey = (v: string) => (v.length > 6 ? `${v.slice(0, 3)}••••${v.slice(-2)}` : '••••');

interface CredentialForm {
  clientId: string;
  clientSecret: string;
  environment: MyInvoisEnvironment;
}

function MyInvoisCredentialsCard() {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<CredentialForm>();
  const { data: existing, isLoading } = useQuery({
    queryKey: ['myinvois-credentials'],
    queryFn: getCredentials,
    retry: false,
  });

  const [editing, setEditing] = useState(false);
  const [revealed, setRevealed] = useState<RevealedCredentialResponse | null>(null);
  const [pw, setPw] = useState('');
  const [pwIntent, setPwIntent] = useState<'reveal' | 'edit' | null>(null);

  // Populate the (read-only) display fields from either the revealed values or the masked ones.
  const showDisplay = (r: RevealedCredentialResponse | null) => {
    form.setFieldsValue({
      clientId: r ? r.clientId : existing ? maskKey(existing.clientId) : '',
      clientSecret: r ? r.clientSecret : existing ? SECRET_MASK : '',
      environment: r?.environment ?? existing?.environment ?? 'SANDBOX',
    });
  };

  useEffect(() => {
    if (isLoading) return;
    if (!existing) {
      // First-time setup: open the form straight away.
      setEditing(true);
      form.setFieldsValue({ environment: 'SANDBOX' });
    } else if (!editing) {
      showDisplay(revealed);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing, isLoading]);

  const saveMutation = useMutation({
    mutationFn: saveCredentials,
    onSuccess: (_res, vars) => {
      message.success('MyInvois credentials saved');
      setRevealed({ clientId: vars.clientId, clientSecret: vars.clientSecret, environment: vars.environment });
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ['myinvois-credentials'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to save credentials'),
  });

  const revealMutation = useMutation({
    mutationFn: () => revealCredentials({ password: pw }),
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

  const onFinish = (values: CredentialForm) => saveMutation.mutate(values);

  const firstTime = !isLoading && !existing;

  return (
    <Card
      title="API Credentials"
      style={{ height: '100%' }}
      extra={
        !firstTime && !editing ? (
          <Space size={2}>
            <Tooltip title={revealed ? 'Hide' : 'Reveal'}>
              <Button type="text" icon={revealed ? <EyeInvisibleOutlined /> : <EyeOutlined />} onClick={onReveal} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button type="text" icon={<EditOutlined />} onClick={onEdit} />
            </Tooltip>
          </Space>
        ) : null
      }
    >
      <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
        The client_id / client_secret (App Key / App Secret) issued by LHDN for your system.
      </Typography.Paragraph>

      <Form form={form} layout="vertical" onFinish={onFinish} disabled={!editing}>
        <Form.Item name="clientId" label="App Key (client_id)" rules={editing ? [{ required: true }] : []}>
          <Input placeholder="App Key" />
        </Form.Item>
        <Form.Item name="clientSecret" label="App Secret (client_secret)" rules={editing ? [{ required: true }] : []}>
          <Input placeholder="App Secret" />
        </Form.Item>
        <Form.Item name="environment" label="Environment" rules={editing ? [{ required: true }] : []}>
          <Select
            options={[
              { value: 'SANDBOX', label: 'Sandbox (preprod)' },
              { value: 'PRODUCTION', label: 'Production' },
            ]}
          />
        </Form.Item>
        {editing && (
          <Space>
            <Button type="primary" htmlType="submit" loading={saveMutation.isPending}>
              Save credentials
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
          Re-enter your account password to {pwIntent === 'edit' ? 'edit your' : 'view the stored'} credentials.
        </Typography.Paragraph>
        <Input.Password
          value={pw}
          placeholder="Account password"
          onChange={(e) => setPw(e.target.value)}
          onPressEnter={() => revealMutation.mutate()}
        />
      </Modal>
    </Card>
  );
}

function AppearanceCard() {
  const { mode, setMode } = useTheme();
  return (
    <Card title="Appearance">
      <Segmented
        value={mode}
        onChange={(v) => setMode(v as 'light' | 'dark')}
        options={[
          { label: 'Light', value: 'light', icon: <BulbOutlined /> },
          { label: 'Dark', value: 'dark', icon: <MoonOutlined /> },
        ]}
        block
      />
    </Card>
  );
}

function BusinessProfileCard() {
  const queryClient = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['business-profile'],
    queryFn: getBusinessProfile,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: saveBusinessProfile,
    onSuccess: () => {
      message.success('Business profile saved');
      queryClient.invalidateQueries({ queryKey: ['business-profile'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to save business profile'),
  });

  const [form] = Form.useForm<BusinessProfile>();

  useEffect(() => {
    if (existing) form.setFieldsValue(existing);
  }, [existing, form]);

  const onFinish = (values: BusinessProfile) => mutation.mutate(values);

  // Pair short fields two-to-a-row; give long fields (addresses, MSIC description) their own width.
  const half = { xs: 24, sm: 12 } as const;
  const third = { xs: 24, sm: 8 } as const;

  return (
    <Card title="Business Profile" style={{ height: '100%' }}>
      <Typography.Paragraph type="secondary" style={{ marginBottom: 20 }}>
        Your own registration details as the supplier on every e-Invoice — set once here, not re-guessed by the
        AI from each uploaded document.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ idType: 'NRIC', countryCode: 'MYS', defaultSubmissionMode: 'INDIVIDUAL' }}
      >
        {/* Kept so the backend still receives a value; the create flow is type-first now. */}
        <Form.Item name="defaultSubmissionMode" hidden>
          <Input />
        </Form.Item>
        <Row gutter={16}>
          <Col {...half}>
            <Form.Item name="registrationName" label="Registration name" rules={[{ required: true }]}>
              <Input placeholder="Legal / registered name" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item name="tin" label="TIN" rules={[{ required: true }]}>
              <Input placeholder="e.g. IG50974019070" />
            </Form.Item>
          </Col>
          <Col {...half}>
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
          <Col {...half}>
            <Form.Item name="idValue" label="ID number" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item name="sstRegistration" label="SST registration">
              <Input placeholder="NA if none" />
            </Form.Item>
          </Col>
          <Col {...half}>
            <Form.Item name="ttxRegistration" label="Tourism tax">
              <Input placeholder="NA if none" />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="msicCode" label="MSIC code">
              <Input placeholder="e.g. 47411" />
            </Form.Item>
          </Col>
          <Col xs={24} sm={16}>
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
          <Col {...third}>
            <Form.Item name="city" label="City">
              <Input />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="postalZone" label="Postcode">
              <Input />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="stateCode" label="State">
              <Select options={MALAYSIA_STATE_CODES} showSearch optionFilterProp="label" />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="countryCode" label="Country">
              <Input disabled />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="phone" label="Phone">
              <Input />
            </Form.Item>
          </Col>
          <Col {...third}>
            <Form.Item name="email" label="Email">
              <Input />
            </Form.Item>
          </Col>
        </Row>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Save business profile
        </Button>
      </Form>
    </Card>
  );
}

export default function Settings() {
  return (
    <Row gutter={[16, 16]} align="top">
      <Col xs={24} lg={8}>
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <MyInvoisCredentialsCard />
          <AppearanceCard />
        </Space>
      </Col>
      <Col xs={24} lg={16}>
        <BusinessProfileCard />
      </Col>
    </Row>
  );
}
