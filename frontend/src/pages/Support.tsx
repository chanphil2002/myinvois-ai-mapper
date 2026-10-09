import { Button, Card, Form, Input, Space, Typography, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { submitSupport } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

const SUPPORT_EMAIL = 'chanphil2002@gmail.com';

interface FormValues {
  subject: string;
  body: string;
}

export default function Support() {
  const { email } = useAuth();
  const [form] = Form.useForm<FormValues>();

  const mutation = useMutation({
    mutationFn: submitSupport,
    onSuccess: () => {
      message.success("Thanks! We've received your message and will get back to you by email.");
      form.resetFields();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not send your message'),
  });

  const mailtoFor = (values: Partial<FormValues>) =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(values.subject || 'MyTax support')}&body=${encodeURIComponent(
      (values.body || '') + (email ? `\n\n— ${email}` : ''),
    )}`;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', width: '100%' }}>
      <Typography.Title level={3} style={{ marginTop: 0 }}>
        Contact Us
      </Typography.Title>
      <Typography.Paragraph type="secondary">
        Ran into a problem or have a question? Send us a message and we'll get back to you
        {email ? ` at ${email}` : ''}. You can also email us directly at{' '}
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </Typography.Paragraph>

      <Card>
        <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
          <Form.Item name="subject" label="Subject" rules={[{ required: true, message: 'Please add a subject' }]}>
            <Input placeholder="e.g. Upload keeps failing" />
          </Form.Item>
          <Form.Item name="body" label="Message" rules={[{ required: true, message: 'Please describe your issue' }]}>
            <Input.TextArea rows={6} placeholder="Tell us what happened and what you expected…" />
          </Form.Item>
          <Space wrap>
            <Button type="primary" htmlType="submit" loading={mutation.isPending}>
              Send message
            </Button>
            <Button
              icon={<MailOutlined />}
              onClick={() => {
                const v = form.getFieldsValue();
                window.location.href = mailtoFor(v);
              }}
            >
              Open in email app
            </Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
