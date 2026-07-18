import { useState } from 'react';
import { Button, Card, Form, Input, Typography, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/endpoints';
import { useAuth } from '../auth/AuthContext';

export default function Register() {
  const navigate = useNavigate();
  const auth = useAuth();
  const [loading, setLoading] = useState(false);

  const onFinish = async (values: {
    email: string;
    password: string;
    companyName: string;
    tin?: string;
  }) => {
    setLoading(true);
    try {
      const result = await register(values);
      auth.login(result);
      navigate('/');
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <Card style={{ width: 420 }}>
        <Typography.Title level={3}>Create your account</Typography.Title>
        <Form layout="vertical" onFinish={onFinish}>
          <Form.Item name="companyName" label="Company name" rules={[{ required: true }]}>
            <Input autoFocus />
          </Form.Item>
          <Form.Item name="tin" label="Company TIN (optional)">
            <Input />
          </Form.Item>
          <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="password" label="Password" rules={[{ required: true, min: 8 }]}>
            <Input.Password />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={loading} block>
            Register
          </Button>
        </Form>
        <div style={{ marginTop: 16, textAlign: 'center' }}>
          Already have an account? <Link to="/login">Log in</Link>
        </div>
      </Card>
    </div>
  );
}
