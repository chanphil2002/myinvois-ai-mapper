import { Button, Card, Form, Input, Select, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getCredentials, saveCredentials } from '../api/endpoints';
import type { MyInvoisEnvironment } from '../api/types';

export default function Settings() {
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

  return (
    <Card style={{ maxWidth: 520 }}>
      <Typography.Title level={4}>MyInvois API Credentials</Typography.Title>
      <Typography.Paragraph type="secondary">
        Enter the client_id / client_secret issued by LHDN for your intermediary/taxpayer system.
        {existing && (
          <>
            {' '}
            Currently configured: <strong>{existing.clientId}</strong> ({existing.environment}).
          </>
        )}
      </Typography.Paragraph>
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
