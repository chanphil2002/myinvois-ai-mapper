import { useState } from 'react';
import { Button, Card, Modal, Popconfirm, Space, Spin, Tag, Typography, message, theme } from 'antd';
import {
  FileImageOutlined,
  FilePdfOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  EditOutlined,
  EyeOutlined,
  DeleteOutlined,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { deleteDocument, getDocument, getDocumentFile } from '../api/endpoints';

const IMAGE_TYPES = ['png', 'jpg', 'jpeg', 'webp', 'gif'];

function fileIcon(type: string) {
  const t = type.toLowerCase();
  if (IMAGE_TYPES.includes(t)) return <FileImageOutlined />;
  if (t === 'pdf') return <FilePdfOutlined />;
  if (t === 'xlsx' || t === 'xls' || t === 'csv') return <FileExcelOutlined />;
  return <FileTextOutlined />;
}

/**
 * Shows which source the invoice came from — the parsed upload (with inline preview + download)
 * or a manual key-in — and lets the user delete the whole entry (document + derived invoice).
 */
export default function SourceDocumentCard({ documentId }: { documentId: number }) {
  const { token } = theme.useToken();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: doc, isLoading } = useQuery({
    queryKey: ['document', documentId],
    queryFn: () => getDocument(documentId),
  });

  const [preview, setPreview] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);

  const openPreview = async () => {
    setPreviewLoading(true);
    try {
      const blob = await getDocumentFile(documentId);
      setPreview(URL.createObjectURL(blob));
    } catch (err) {
      message.error(err instanceof Error ? err.message : 'Could not load document');
    } finally {
      setPreviewLoading(false);
    }
  };

  const closePreview = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
  };

  const deleteMutation = useMutation({
    mutationFn: () => deleteDocument(documentId),
    onSuccess: () => {
      message.success('Invoice deleted');
      queryClient.invalidateQueries({ queryKey: ['mapped-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      navigate('/');
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not delete'),
  });

  if (isLoading || !doc) return null;

  const isManual = doc.fileType === 'manual' || doc.status === 'MANUAL';
  const type = (doc.fileType || '').toLowerCase();
  const isImage = IMAGE_TYPES.includes(type);
  const isPdf = type === 'pdf';

  const deleteButton = (
    <Popconfirm
      title="Delete this invoice?"
      description="This removes the invoice and its source document."
      okText="Delete"
      okButtonProps={{ danger: true, loading: deleteMutation.isPending }}
      onConfirm={() => deleteMutation.mutate()}
    >
      <Button size="small" danger icon={<DeleteOutlined />}>
        Delete
      </Button>
    </Popconfirm>
  );

  return (
    <Card title="Source" extra={deleteButton}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            flex: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            color: isManual ? '#8b5cf6' : '#3b5bdb',
            background: isManual ? '#8b5cf622' : '#3b5bdb22',
          }}
        >
          {isManual ? <EditOutlined /> : fileIcon(type)}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          {isManual ? (
            <>
              <Typography.Text strong>Manually keyed in</Typography.Text>
              <div style={{ fontSize: 12, color: token.colorTextSecondary }}>No source file — entered by hand.</div>
            </>
          ) : (
            <>
              <Typography.Text strong ellipsis style={{ display: 'block' }}>
                {doc.originalFilename}
              </Typography.Text>
              <Space size={6} style={{ marginTop: 2 }}>
                <Tag>{type.toUpperCase()}</Tag>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  parsed by AI
                </Typography.Text>
              </Space>
            </>
          )}
        </div>
        {!isManual && (
          <Button icon={<EyeOutlined />} loading={previewLoading} onClick={openPreview}>
            View file
          </Button>
        )}
      </div>

      <Modal
        open={!!preview}
        title={doc.originalFilename}
        onCancel={closePreview}
        footer={
          preview ? (
            <a href={preview} download={doc.originalFilename}>
              Download
            </a>
          ) : null
        }
        width={isImage || isPdf ? 720 : 480}
        centered
      >
        {isImage && preview && (
          <img src={preview} alt={doc.originalFilename} style={{ width: '100%', borderRadius: 8 }} />
        )}
        {isPdf && preview && (
          <iframe src={preview} title="document" style={{ width: '100%', height: '70vh', border: 'none' }} />
        )}
        {preview && !isImage && !isPdf && (
          <Typography.Paragraph type="secondary" style={{ margin: 0 }}>
            Preview isn't available for <strong>.{type}</strong> files — use Download to open it.
          </Typography.Paragraph>
        )}
      </Modal>

      {previewLoading && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </Card>
  );
}
