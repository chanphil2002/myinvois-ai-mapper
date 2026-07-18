import { useState } from 'react';
import { Button, Card, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import FileUploadDropzone from '../components/FileUploadDropzone';
import { listDocuments, listMappingsForDocument, runMapping, uploadDocument } from '../api/endpoints';
import type { DocumentResponse } from '../api/types';

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mappingDocId, setMappingDocId] = useState<number | null>(null);

  const { data: documents, isLoading } = useQuery({ queryKey: ['documents'], queryFn: listDocuments });

  // Fetched per document so a completed mapping stays reachable (via "View mapping") even
  // after the user navigates away mid-run or switches tabs and comes back later.
  const mappingQueries = useQueries({
    queries: (documents ?? []).map((doc) => ({
      queryKey: ['mappings', doc.id],
      queryFn: () => listMappingsForDocument(doc.id),
      enabled: !!documents,
    })),
  });

  const latestMappingByDocId = new Map<number, number>();
  (documents ?? []).forEach((doc, index) => {
    const mappings = mappingQueries[index]?.data ?? [];
    if (mappings.length > 0) {
      const latest = mappings.reduce((a, b) => (b.id > a.id ? b : a));
      latestMappingByDocId.set(doc.id, latest.id);
    }
  });

  const uploadMutation = useMutation({
    mutationFn: uploadDocument,
    onSuccess: () => {
      message.success('File uploaded');
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Upload failed'),
  });

  const mapMutation = useMutation({
    mutationFn: runMapping,
    onSuccess: (mappedInvoice, documentId) => {
      message.success('AI mapping complete — review the results');
      queryClient.invalidateQueries({ queryKey: ['mappings', documentId] });
      navigate(`/mapped-invoices/${mappedInvoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Mapping failed'),
    onSettled: () => setMappingDocId(null),
  });

  const columns = [
    { title: 'File', dataIndex: 'originalFilename', key: 'originalFilename' },
    { title: 'Type', dataIndex: 'fileType', key: 'fileType' },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: DocumentResponse['status']) => <Tag>{status}</Tag>,
    },
    {
      title: 'Action',
      key: 'action',
      render: (_: unknown, record: DocumentResponse) => {
        const mappedInvoiceId = latestMappingByDocId.get(record.id);
        return (
          <div style={{ display: 'flex', gap: 8 }}>
            {mappedInvoiceId && <Link to={`/mapped-invoices/${mappedInvoiceId}`}>View mapping</Link>}
            <Button
              size="small"
              loading={mappingDocId === record.id}
              onClick={() => {
                setMappingDocId(record.id);
                mapMutation.mutate(record.id);
              }}
            >
              {mappedInvoiceId ? 'Re-run AI mapping' : 'Run AI mapping'}
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <Card>
        <Typography.Title level={4}>Upload a source document</Typography.Title>
        <FileUploadDropzone
          uploading={uploadMutation.isPending}
          onFileSelected={(file) => uploadMutation.mutate(file)}
        />
      </Card>
      <Card>
        <Typography.Title level={4}>Your documents</Typography.Title>
        <Table
          rowKey="id"
          loading={isLoading}
          dataSource={documents ?? []}
          columns={columns}
          pagination={{ pageSize: 10 }}
        />
      </Card>
    </div>
  );
}
