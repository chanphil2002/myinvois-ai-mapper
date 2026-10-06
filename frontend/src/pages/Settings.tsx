import { useEffect, useState } from 'react';
import { Button, Card, Form, Input, Modal, Select, Space, Typography, message } from 'antd';
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

function MyInvoisCredentialsCard() {
  const queryClient = useQueryClient();
  const { data: existing } = useQuery({
    queryKey: ['myinvois-credentials'],
    queryFn: getCredentials,
    retry: false,
  });

  const mutation = useMutation({
    mutationFn: saveCredentials,
    onSuccess: () => {
      message.success('MyInvois credentials saved');
      queryClient.invalidateQueries({ queryKey: ['myinvois-credentials'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to save credentials'),
  });

  const onFinish = (values: { clientId: string; clientSecret: string; environment: MyInvoisEnvironment }) => {
    mutation.mutate(values);
  };

  const [revealOpen, setRevealOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [revealed, setRevealed] = useState<RevealedCredentialResponse | null>(null);

  const revealMutation = useMutation({
    mutationFn: () => revealCredentials({ password }),
    onSuccess: (data) => {
      setRevealed(data);
      setRevealOpen(false);
      setPassword('');
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not reveal credentials'),
  });

  return (
    <Card style={{ maxWidth: 520 }}>
      <Typography.Title level={4}>MyInvois API Credentials</Typography.Title>
      <Typography.Paragraph type="secondary">
        Enter the client_id / client_secret (App Key / App Secret) issued by LHDN for your
        intermediary/taxpayer system.
      </Typography.Paragraph>

      {existing && (
        <Card size="small" type="inner" title="Current credentials" style={{ marginBottom: 16 }}>
          <Typography.Paragraph style={{ marginBottom: 8 }}>
            <Typography.Text type="secondary">App Key (client id): </Typography.Text>
            <Typography.Text copyable>{existing.clientId}</Typography.Text>{' '}
            <Typography.Text type="secondary">({existing.environment})</Typography.Text>
          </Typography.Paragraph>
          {revealed ? (
            <Typography.Paragraph style={{ marginBottom: 0 }}>
              <Typography.Text type="secondary">App Secret: </Typography.Text>
              <Typography.Text copyable code>{revealed.clientSecret}</Typography.Text>
            </Typography.Paragraph>
          ) : (
            <Space>
              <Typography.Text type="secondary">App Secret: ••••••••</Typography.Text>
              <Button size="small" onClick={() => setRevealOpen(true)}>
                Reveal
              </Button>
            </Space>
          )}
        </Card>
      )}

      <Modal
        title="Confirm your password"
        open={revealOpen}
        onOk={() => revealMutation.mutate()}
        confirmLoading={revealMutation.isPending}
        okText="Reveal"
        onCancel={() => {
          setRevealOpen(false);
          setPassword('');
        }}
      >
        <Typography.Paragraph type="secondary">
          Re-enter your account password to view the stored App Secret.
        </Typography.Paragraph>
        <Input.Password
          value={password}
          placeholder="Account password"
          onChange={(e) => setPassword(e.target.value)}
          onPressEnter={() => revealMutation.mutate()}
        />
      </Modal>
      <Form layout="vertical" onFinish={onFinish} initialValues={{ environment: 'SANDBOX' }}>
        <Form.Item name="clientId" label="Client ID" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item name="clientSecret" label="Client Secret" rules={[{ required: true }]}>
          <Input.Password />
        </Form.Item>
        <Form.Item name="environment" label="Environment" rules={[{ required: true }]}>
          <Select
            options={[
              { value: 'SANDBOX', label: 'Sandbox (preprod)' },
              { value: 'PRODUCTION', label: 'Production' },
            ]}
          />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Save credentials
        </Button>
      </Form>
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
    if (existing) {
      form.setFieldsValue(existing);
    }
  }, [existing, form]);

  const onFinish = (values: BusinessProfile) => {
    mutation.mutate(values);
  };

  return (
    <Card style={{ maxWidth: 640 }}>
      <Typography.Title level={4}>Business Profile</Typography.Title>
      <Typography.Paragraph type="secondary">
        Your own registration details as the supplier on every e-Invoice you submit — this is set once here,
        not re-guessed by the AI from each uploaded document.
      </Typography.Paragraph>
      <Form
        form={form}
        layout="vertical"
        onFinish={onFinish}
        initialValues={{ idType: 'NRIC', countryCode: 'MYS', defaultSubmissionMode: 'INDIVIDUAL' }}
      >
        <Form.Item
          name="defaultSubmissionMode"
          label="Default submission mode"
          rules={[{ required: true }]}
          tooltip="Which mode the Upload page starts on — you can still switch it per upload."
        >
          <Select
            options={[
              { value: 'INDIVIDUAL', label: 'Individual e-Invoice' },
              { value: 'CONSOLIDATED', label: 'Consolidated e-Invoice' },
            ]}
          />
        </Form.Item>
        <Form.Item name="registrationName" label="Registration name" rules={[{ required: true }]}>
          <Input placeholder="Legal or registered business name" />
        </Form.Item>
        <Form.Item name="tin" label="TIN" rules={[{ required: true }]}>
          <Input placeholder="e.g. IG50974019070" />
        </Form.Item>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="idType" label="ID type" rules={[{ required: true }]} style={{ width: '35%' }}>
            <Select
              options={[
                { value: 'NRIC', label: 'NRIC (individual)' },
                { value: 'BRN', label: 'BRN (company)' },
                { value: 'PASSPORT', label: 'Passport' },
                { value: 'ARMY', label: 'Army ID' },
              ]}
            />
          </Form.Item>
          <Form.Item name="idValue" label="ID number" rules={[{ required: true }]} style={{ width: '65%' }}>
            <Input />
          </Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="sstRegistration" label="SST registration" style={{ width: '50%' }}>
            <Input placeholder="NA if not registered" />
          </Form.Item>
          <Form.Item name="ttxRegistration" label="Tourism tax registration" style={{ width: '50%' }}>
            <Input placeholder="NA if not registered" />
          </Form.Item>
        </Space.Compact>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="msicCode" label="MSIC code" style={{ width: '30%' }}>
            <Input placeholder="e.g. 47411" />
          </Form.Item>
          <Form.Item name="msicDescription" label="MSIC description" style={{ width: '70%' }}>
            <Input placeholder="e.g. Retail sale of computers..." />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="addressLine1" label="Address line 1">
          <Input />
        </Form.Item>
        <Form.Item name="addressLine2" label="Address line 2">
          <Input />
        </Form.Item>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="city" label="City" style={{ width: '40%' }}>
            <Input />
          </Form.Item>
          <Form.Item name="postalZone" label="Postcode" style={{ width: '25%' }}>
            <Input />
          </Form.Item>
          <Form.Item name="stateCode" label="State" style={{ width: '35%' }}>
            <Select options={MALAYSIA_STATE_CODES} showSearch optionFilterProp="label" />
          </Form.Item>
        </Space.Compact>
        <Form.Item name="countryCode" label="Country" initialValue="MYS">
          <Input disabled />
        </Form.Item>
        <Space.Compact style={{ width: '100%' }}>
          <Form.Item name="phone" label="Phone" style={{ width: '50%' }}>
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" style={{ width: '50%' }}>
            <Input />
          </Form.Item>
        </Space.Compact>
        <Button type="primary" htmlType="submit" loading={mutation.isPending}>
          Save business profile
        </Button>
      </Form>
    </Card>
  );
}

export default function Settings() {
  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <MyInvoisCredentialsCard />
      <BusinessProfileCard />
    </Space>
  );
}
