import { Card, Col, Row, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';

/** Step 1 of the create flow: choose the e-invoice type. */
export default function CreateInvoice() {
  const navigate = useNavigate();

  const options = [
    {
      key: 'individual',
      title: 'Individual e-Invoice',
      description: 'A single invoice issued to one identified buyer (B2B / B2G).',
      to: '/create/individual',
    },
    {
      key: 'consolidated',
      title: 'Consolidated e-Invoice',
      description: 'Aggregate a period of B2C sales (no named buyer) into one submission.',
      to: '/create/consolidated',
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
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                {o.title}
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                {o.description}
              </Typography.Paragraph>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
