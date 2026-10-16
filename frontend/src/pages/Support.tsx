import { Button, Card, Form, Input, Select, Space, message } from 'antd';
import { MailOutlined } from '@ant-design/icons';
import { useMutation } from '@tanstack/react-query';
import { submitSupport } from '../api/endpoints';
import Page from '../components/Page';
import { useAuth } from '../auth/AuthContext';

const SUPPORT_EMAIL = 'chanphil2002@gmail.com';

interface FormValues {
  topic: string;
  /** Short summary — required only for "Something else". */
  summary?: string;
  body: string;
}

const OTHER = 'Something else';

/** Common problems, grouped so users find theirs fast; each topic carries a hint for the message. */
const TOPICS: { label: string; options: { value: string; hint: string }[] }[] = [
  {
    label: 'AI reading & uploads',
    options: [
      { value: 'Upload failed or stuck on "Parsing…"', hint: 'Which file (type and roughly when)? Any error message shown?' },
      { value: 'AI read the wrong amounts, dates or items', hint: 'Which invoice, and what should the values have been?' },
      { value: 'Duplicate or missing sales after extraction', hint: 'Which file, and which sales were duplicated or missing?' },
      { value: 'My file type is not supported', hint: 'What kind of file are you trying to upload?' },
    ],
  },
  {
    label: 'LHDN / MyInvois',
    options: [
      { value: 'LHDN rejected my e-invoice', hint: 'Which invoice? Paste the rejection reason shown under Submission history.' },
      { value: 'Submission stuck at "Submitted"', hint: 'Which invoice, and when did you submit it?' },
      { value: 'Need to cancel or correct an issued e-invoice', hint: 'Which invoice, and what needs to change?' },
      { value: 'MyInvois API credentials or connection error', hint: 'Sandbox or Production? Any error message shown?' },
      { value: 'Wrong TIN or business details on my e-invoices', hint: 'Which details are wrong?' },
      { value: 'Consolidated e-invoice period or deadline question', hint: 'Which month are you consolidating?' },
    ],
  },
  {
    label: 'Billing & account',
    options: [
      { value: 'Payment failed or I was charged twice', hint: 'Payment method used, the date and the amount.' },
      { value: 'Change, cancel or renew my plan', hint: 'Which plan would you like?' },
      { value: 'AI allowance ran out', hint: 'Roughly how many documents do you process per month?' },
      { value: 'Referral code problem', hint: 'Which code, and what happened?' },
      { value: "Can't log in or account access", hint: 'Which email do you sign in with?' },
    ],
  },
  {
    label: 'Other',
    options: [
      { value: 'App is slow, crashing or not loading', hint: 'Phone app or web? Which page?' },
      { value: 'Feature request', hint: 'What would you like MyTax to do?' },
      { value: OTHER, hint: 'Tell us what happened and what you expected…' },
    ],
  },
];
const HINTS = Object.fromEntries(TOPICS.flatMap((g) => g.options.map((o) => [o.value, o.hint])));

const subjectOf = (v: Partial<FormValues>) =>
  v.topic === OTHER ? v.summary?.trim() || 'MyTax support' : [v.topic, v.summary?.trim()].filter(Boolean).join(' — ');

export default function Support() {
  const { email } = useAuth();
  const [form] = Form.useForm<FormValues>();
  const topic = Form.useWatch('topic', form);

  const mutation = useMutation({
    mutationFn: (v: FormValues) => submitSupport({ subject: subjectOf(v), body: v.body }),
    onSuccess: () => {
      message.success("Thanks! We've received your message and will get back to you by email.");
      form.resetFields();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not send your message'),
  });

  const mailtoFor = (values: Partial<FormValues>) =>
    `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subjectOf(values) || 'MyTax support')}&body=${encodeURIComponent(
      (values.body || '') + (email ? `\n\n— ${email}` : ''),
    )}`;

  return (
    <Page
      title="Contact Us"
      maxWidth={640}
      subtitle={
        <>
          Ran into a problem or have a question? Send us a message and we'll get back to you
          {email ? ` at ${email}` : ''}. You can also email us directly at{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </>
      }
    >
      <Card title="Send us a message">
        <Form form={form} layout="vertical" onFinish={(v) => mutation.mutate(v)}>
          <Form.Item name="topic" label="What do you need help with?" rules={[{ required: true, message: 'Pick a topic' }]}>
            <Select
              showSearch
              placeholder="Choose a topic"
              optionFilterProp="label"
              options={TOPICS.map((g) => ({
                label: g.label,
                options: g.options.map((o) => ({ value: o.value, label: o.value })),
              }))}
            />
          </Form.Item>
          <Form.Item
            name="summary"
            label={topic === OTHER ? 'Subject' : 'Short summary (optional)'}
            rules={topic === OTHER ? [{ required: true, message: 'Add a subject' }] : []}
          >
            <Input placeholder={topic === OTHER ? 'e.g. Question about exporting reports' : 'e.g. Invoice-2026-10-15#10'} maxLength={120} />
          </Form.Item>
          <Form.Item name="body" label="Message" rules={[{ required: true, message: 'Please describe your issue' }]}>
            <Input.TextArea rows={6} placeholder={(topic && HINTS[topic]) || 'Tell us what happened and what you expected…'} />
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
    </Page>
  );
}
