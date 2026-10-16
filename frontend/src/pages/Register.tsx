import { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import AuthShell from '../components/AuthShell';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { register } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);
  // Salesperson share links look like /register?ref=CODE — prefill it.
  const [params] = useSearchParams();
  const referral = params.get('ref');

  const onFinish = async (values: {
    email: string;
    password: string;
    companyName: string;
    tin?: string;
    referralCode?: string;
  }) => {
    setLoading(true);
    try {
      const result = await register({ ...values, referralCode: values.referralCode?.trim() || undefined });
      auth.login(result);
      navigate('/');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      subtitle="Create your MyTax account"
      footer={
        <>
          Already have an account? <Link to="/login">Log in</Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="companyName" label="Company name" rules={[{ required: true }]}>
          <Input size="large" autoComplete="organization" />
        </Form.Item>
        <Form.Item name="tin" label="Company TIN (optional)">
          <Input size="large" autoCapitalize="characters" autoCorrect="off" spellCheck={false} />
        </Form.Item>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input
            size="large"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
          <Input.Password size="large" autoComplete="new-password" />
        </Form.Item>
        <Form.Item name="referralCode" label="Referral code (optional)" initialValue={referral ?? undefined}>
          <Input size="large" autoCapitalize="characters" autoCorrect="off" spellCheck={false} placeholder="e.g. AMIRHA-R7MH" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Create account
        </Button>
      </Form>
    </AuthShell>
  );
}
