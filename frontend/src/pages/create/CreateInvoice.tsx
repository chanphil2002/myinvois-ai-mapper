import type { ReactNode } from 'react';
import { Card, Col, Row, Typography } from 'antd';
import { FileTextOutlined, AppstoreOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

interface Option {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  color: string;
}

/** Step 1 of the create flow: choose the e-invoice type. */
export default function CreateInvoice() {
  const navigate = useNavigate();

  const options: Option[] = [
    {
      key: 'individual',
      title: 'Individual e-Invoice',
      description: 'A single invoice issued to one identified buyer (B2B / B2G).',
      to: '/create/individual',
      icon: <FileTextOutlined />,
      color: '#3b5bdb',
    },
    {
      key: 'consolidated',
      title: 'Consolidated e-Invoice',
      description: 'Aggregate a period of B2C sales (no named buyer) into one submission.',
      to: '/create/consolidated',
      icon: <AppstoreOutlined />,
      color: '#16a34a',
    },
  ];

  return (
    <div style={{ maxWidth: 820 }}>
      <Typography.Title level={3}>Create an e-Invoice</Typography.Title>
      <Typography.Paragraph type="secondary">Choose what kind of e-invoice you want to create.</Typography.Paragraph>
      <Row gutter={[16, 16]}>
        {options.map((o) => (
          <Col xs={24} sm={12} key={o.key}>
            <Card hoverable onClick={() => navigate(o.to)} style={{ height: '100%' }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 22,
                  color: o.color,
                  background: `${o.color}14`,
                  marginBottom: 14,
                }}
              >
                {o.icon}
              </div>
              <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 6 }}>
                {o.title}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
                {o.description}
              </Typography.Paragraph>
              <Typography.Text style={{ color: o.color, fontWeight: 500 }}>
                Continue <ArrowRightOutlined style={{ fontSize: 12 }} />
              </Typography.Text>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
