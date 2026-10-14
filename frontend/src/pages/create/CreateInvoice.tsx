import type { ReactNode } from 'react';
import { Col, Row } from 'antd';
import Page from '../../components/Page';
import OptionCard from '../../components/OptionCard';
import { FileTextOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../theme/ThemeContext';

interface Option {
  key: string;
  title: string;
  description: string;
  to: string;
  icon: ReactNode;
  color: string;
  soft: string;
}

/** Step 1 of the create flow: choose the e-invoice type. */
export default function CreateInvoice() {
  const navigate = useNavigate();
  const { palette: p } = useTheme();

  const options: Option[] = [
    {
      key: 'individual',
      title: 'Individual e-Invoice',
      description: 'A single invoice issued to one identified buyer (B2B / B2G).',
      to: '/create/individual',
      icon: <FileTextOutlined />,
      color: p.info,
      soft: p.infoSoft,
    },
    {
      key: 'consolidated',
      title: 'Consolidated e-Invoice',
      description: 'Aggregate a period of B2C sales (no named buyer) into one submission.',
      to: '/create/consolidated',
      icon: <AppstoreOutlined />,
      color: p.link,
      soft: p.primarySoft,
    },
  ];

  return (
    <Page title="Create an e-Invoice" subtitle="Choose what kind of e-invoice you want to create." maxWidth={820}>
      <Row gutter={[16, 16]}>
        {options.map((o) => (
          <Col xs={24} sm={12} key={o.key}>
            <OptionCard
              title={o.title}
              description={o.description}
              icon={o.icon}
              color={o.color}
              soft={o.soft}
              onClick={() => navigate(o.to)}
            />
          </Col>
        ))}
      </Row>
    </Page>
  );
}
