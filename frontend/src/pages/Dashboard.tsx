import { useState } from 'react';
import type { Key, ReactNode } from 'react';
import { Button, Card, Col, Modal, Popconfirm, Progress, Row, Space, Spin, Table, Tag, Typography, message, theme } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { deleteDocument, getDocumentFile, getSubscription, listDocuments } from '../api/endpoints';
import type { DocumentResponse } from '../api/types';

const PLAN_CREDITS: Record<string, number> = { beginner: 30, heavy: 500, elite: 1500 };
const FREE_DAILY_CREDITS = 2; // Free tier: 2 documents per day.
const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function StatTile({ title, value, icon, color }: { title: string; value: number; icon: ReactNode; color: string }) {
  const { token } = theme.useToken();
  return (
    <Card size="small" style={{ height: '100%' }} styles={{ body: { padding: 14 } }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 10,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color,
            background: `${color}22`,
          }}
        >
          {icon}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1.1 }}>{value}</div>
          <div
            style={{
              fontSize: 12,
              color: token.colorTextSecondary,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {title}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default function Dashboard() {
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });
  const { data: subscription } = useQuery({ queryKey: ['subscription'], queryFn: getSubscription });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      message.success('Document deleted');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not delete document'),
  });

  const total = documents?.length ?? 0;
  const parsed = documents?.filter((d) => d.status === 'PARSED').length ?? 0;
  const failed = documents?.filter((d) => d.status === 'FAILED').length ?? 0;

  const planId = subscription?.status === 'ACTIVE' ? subscription.plan : null;
  const planName = planId ? subscription?.planName : 'Free';
  const isFree = !planId;

  // Free tier is a daily allowance, so count only today's parses against it.
  const isToday = (iso: string) => new Date(iso).toDateString() === new Date().toDateString();
  const parsedToday = documents?.filter((d) => d.status === 'PARSED' && d.uploadedAt && isToday(d.uploadedAt)).length ?? 0;

  const creditLimit = isFree ? FREE_DAILY_CREDITS : PLAN_CREDITS[planId] ?? FREE_DAILY_CREDITS;
  const creditsUsed = isFree ? parsedToday : parsed;
  const creditsLeft = Math.max(0, creditLimit - creditsUsed);
  const creditPct = creditLimit > 0 ? Math.round((creditsLeft / creditLimit) * 100) : 0;
  const periodLabel = isFree ? 'left today' : 'left';

  // ---- Document preview ----
  const [preview, setPreview] = useState<{ doc: DocumentResponse; url: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async (doc: DocumentResponse) => {
    setPreviewLoading(true);
    try {
      const blob = await getDocumentFile(doc.id);
      setPreview({ doc, url: URL.createObjectURL(blob) });
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not load document');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  };

  const columns = [
    { title: 'File', dataIndex: 'originalFilename', key: 'originalFilename', ellipsis: true },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      filters: ['UPLOADED', 'PARSING', 'PARSED', 'FAILED'].map((s) => ({ text: s, value: s })),
      onFilter: (value: boolean | Key, record: DocumentResponse) => record.status === value,
      render: (s: string) => (
        <Tag color={s === 'PARSED' ? 'green' : s === 'FAILED' ? 'red' : 'default'}>{s}</Tag>
      ),
    },
    {
      title: '',
      key: 'actions',
      width: 120,
      render: (_: unknown, record: DocumentResponse) => (
        <Space size={4}>
          <a onClick={() => openPreview(record)}>
            <EyeOutlined /> View
          </a>
          <Popconfirm
            title="Delete this document?"
            description="This also removes any invoices or transactions derived from it."
            okText="Delete"
            okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
            onConfirm={() => deleteMutation.mutate(record.id)}
          >
            <Button type="text" size="small" danger icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const isImage = preview && IMAGE_TYPES.includes((preview.doc.fileType || '').toLowerCase());
  const isPdf = preview && (preview.doc.fileType || '').toLowerCase() === 'pdf';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Typography.Title level={3} style={{ margin: 0 }}>
        Dashboard
      </Typography.Title>

      {/* Compact stat row — always three across */}
      <Row gutter={[12, 12]}>
        <Col xs={8}>
          <StatTile title="Uploaded" value={total} icon={<FileTextOutlined />} color="#3b5bdb" />
        </Col>
        <Col xs={8}>
          <StatTile title="Parsed" value={parsed} icon={<CheckCircleOutlined />} color="#16a34a" />
        </Col>
        <Col xs={8}>
          <StatTile title="Failed" value={failed} icon={<CloseCircleOutlined />} color="#dc2626" />
        </Col>
      </Row>

      {/* AI parsing credits */}
      <Card size="small" styles={{ body: { padding: 16 } }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
            <div>
              <Typography.Text strong>AI parsing credits</Typography.Text>
              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>
                {planName} plan {isFree && <Link to="/billing">· upgrade</Link>}
              </div>
            </div>
          </div>
          <Typography.Text style={{ fontSize: 16 }}>
            <strong style={{ color: creditsLeft === 0 ? '#dc2626' : token.colorText }}>{creditsLeft}</strong>
            <span style={{ color: token.colorTextTertiary }}> / {creditLimit} {periodLabel}</span>
          </Typography.Text>
        </div>
        <Progress
          percent={creditPct}
          showInfo={false}
          strokeColor={creditsLeft === 0 ? '#dc2626' : '#3b5bdb'}
          style={{ marginTop: 10, marginBottom: 0 }}
        />
      </Card>

      <Card title="Recent documents" extra={<Link to="/create">Create an invoice</Link>}>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={(documents ?? []).slice(0, 6)}
          columns={columns}
          pagination={false}
          size="small"
          scroll={{ x: 'max-content' }}
          locale={{ emptyText: 'No documents yet — upload one from Create → Upload.' }}
        />
      </Card>

      <Modal
        open={!!preview}
        title={preview?.doc.originalFilename}
        onCancel={closePreview}
        footer={
          preview ? (
            <a href={preview.url} download={preview.doc.originalFilename}>
              Download
            </a>
          ) : null
        }
        width={isImage || isPdf ? 720 : 480}
        centered
      >
        {isImage && <img src={preview!.url} alt={preview!.doc.originalFilename} style={{ width: '100%', borderRadius: 8 }} />}
        {isPdf && <iframe src={preview!.url} title="document" style={{ width: '100%', height: '70vh', border: 'none' }} />}
        {preview && !isImage && !isPdf && (
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Preview isn't available for <strong>.{preview.doc.fileType}</strong> files — use Download to open it.
          </Typography.Paragraph>
        )}
      </Modal>

      {previewLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(255,255,255,0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </div>
  );
}
