import { Card, Col, Row, Statistic, Table, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { listDocuments } from '../api/endpoints';

export default function Dashboard() {
  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });

  const total = documents?.length ?? 0;
  const parsed = documents?.filter((d) => d.status === 'PARSED').length ?? 0;
  const failed = documents?.filter((d) => d.status === 'FAILED').length ?? 0;

  const columns = [
    { title: 'File', dataIndex: 'originalFilename', key: 'originalFilename' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s: string) => <Tag>{s}</Tag> },
    { title: 'Uploaded', dataIndex: 'uploadedAt', key: 'uploadedAt' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card>
            <Statistic title="Documents uploaded" value={total} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Parsed" value={parsed} />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic title="Failed" value={failed} valueStyle={{ color: failed > 0 ? '#cf1322' : undefined }} />
          </Card>
        </Col>
      </Row>
      <Card
        title="Recent documents"
        extra={<Link to="/upload">Upload a new file</Link>}
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
        />
      </Card>
    </div>
  );
}
