import { useState } from 'react';
import { Button, Form, Input, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import AuthShell from '../components/AuthShell';

export default function Login() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values);
      auth.login(result);
      navigate('/');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      subtitle="Malaysia e-Invoicing, made simple."
      footer={
        <>
          No account yet? <Link to="/register">Create one</Link>
        </>
      }
    >
      <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
        <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
          <Input
            size="large"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            placeholder="you@company.com"
          />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true }]}>
          <Input.Password size="large" autoComplete="current-password" placeholder="••••••••" />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} block size="large">
          Log in
        </Button>
      </Form>
    </AuthShell>
  );
}
