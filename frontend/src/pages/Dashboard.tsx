import type { Key, ReactNode } from 'react';
import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { FileTextOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listDocuments } from '../api/endpoints';
import type { DocumentResponse } from '../api/types';

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: ReactNode; color: string }) {
  return (
    <Card style={{ height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
            color,
            background: `${color}14`,
          }}
        >
          {icon}
        </div>
        <Statistic title={title} value={value} valueStyle={{ color }} />
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });

  const total = documents?.length ?? 0;
  const parsed = documents?.filter((d) => d.status === 'PARSED').length ?? 0;
  const failed = documents?.filter((d) => d.status === 'FAILED').length ?? 0;

  const columns = [
    { title: 'File', dataIndex: 'originalFilename', key: 'originalFilename' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      filters: ['UPLOADED', 'PARSING', 'PARSED', 'FAILED'].map((s) => ({ text: s, value: s })),
      onFilter: (value: boolean | Key, record: DocumentResponse) => record.status === value,
      render: (s: string) => <Tag>{s}</Tag>,
    },
    { title: 'Uploaded', dataIndex: 'uploadedAt', key: 'uploadedAt' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <StatCard title="Documents uploaded" value={total} icon={<FileTextOutlined />} color="#3b5bdb" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="Parsed" value={parsed} icon={<CheckCircleOutlined />} color="#16a34a" />
        </Col>
        <Col xs={24} sm={8}>
          <StatCard title="Failed" value={failed} icon={<CloseCircleOutlined />} color="#dc2626" />
        </Col>
      </Row>
      <Card
        title="Recent documents"
        extra={<Link to="/create">Create an invoice</Link>}
      >
        <Typography.Paragraph type="secondary">
          Upload a document, then run AI mapping to review and submit it to MyInvois.
        </Typography.Paragraph>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={(documents ?? []).slice(0, 5)}
          columns={columns}
          pagination={false}
          scroll={{ x: 'max-content' }}
        />
      </Card>
    </div>
  );
}
