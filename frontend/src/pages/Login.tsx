import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { login } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';
import BrandLogo from '../components/BrandLogo';

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
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: 16,
        background: 'linear-gradient(160deg, #eef2ff 0%, #f4f6fb 45%, #e8f0fe 100%)',
      }}
    >
      <Card style={{ width: '100%', maxWidth: 400, boxShadow: '0 12px 40px rgba(16,24,40,0.10)' }} styles={{ body: { padding: 28 } }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <BrandLogo size="lg" />
        </div>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          Malaysia e-Invoicing, made simple.
        </Typography.Paragraph>
        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input autoFocus size="large" placeholder="you@company.com" />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true }]}>
            <Input.Password size="large" placeholder="••••••••" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block size="large">
            Log in
          </Button>
        </Form>
        <div style={{ marginTop: 20, textAlign: 'center', color: '#64748b' }}>
          No account yet? <Link to="/register">Create one</Link>
        </div>
      </Card>
    </div>
  );
}
