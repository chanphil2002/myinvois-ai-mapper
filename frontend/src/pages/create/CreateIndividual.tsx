import { useState } from 'react';
import { Button, Card, Col, Row, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import FileUploadDropzone from '../../components/FileUploadDropzone';
import { createManualInvoice, runMapping, uploadDocument } from '../../api/endpoints';

type Method = null | 'manual' | 'upload';

export default function CreateIndividual() {
  const navigate = useNavigate();
  const [method, setMethod] = useState<Method>(null);

  const manualMutation = useMutation({
    mutationFn: () =>
      createManualInvoice({
        invoiceTypeCode: '01',
        currencyCode: 'MYR',
        buyerCountryCode: 'MYS',
        lineItems: [],
      }),
    onSuccess: (invoice) => {
      message.success('Blank invoice created — key in the details');
      navigate(`/mapped-invoices/${invoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not create invoice'),
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const doc = await uploadDocument(file);
      return runMapping(doc.id);
    },
    onSuccess: (invoice) => {
      message.success('AI mapping complete — review the results');
      navigate(`/mapped-invoices/${invoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Mapping failed'),
  });

  // A single Back that steps up one level (method screen → chooser → type picker).
  const back = (
    <Button
      type="link"
      style={{ paddingLeft: 0 }}
      onClick={() => (method === null ? navigate('/create') : setMethod(null))}
    >
      ← Back
    </Button>
  );

  if (method === null) {
    return (
      <div style={{ maxWidth: 820 }}>
        {back}
        <Typography.Title level={3} style={{ marginTop: 8 }}>
          Individual e-Invoice
        </Typography.Title>
        <Typography.Paragraph type="secondary">How do you want to enter the invoice?</Typography.Paragraph>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12}>
            <Card hoverable onClick={() => setMethod('manual')} style={{ height: '100%' }}>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Key in manually
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Fill in the invoice and its line items yourself.
              </Typography.Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12}>
            <Card hoverable onClick={() => setMethod('upload')} style={{ height: '100%' }}>
              <Typography.Title level={4} style={{ marginTop: 0 }}>
                Upload a document
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                Upload a file and let AI mapping fill in the invoice for you.
              </Typography.Paragraph>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 820 }}>
      {back}
      {method === 'manual' ? (
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Key in an individual invoice
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            We'll create a blank draft and open the editor, where you enter the buyer and line items, then confirm
            and submit to MyInvois.
          </Typography.Paragraph>
          <Button type="primary" loading={manualMutation.isPending} onClick={() => manualMutation.mutate()}>
            Start blank invoice
          </Button>
        </Card>
      ) : (
        <Card>
          <Typography.Title level={4} style={{ marginTop: 0 }}>
            Upload a source document
          </Typography.Title>
          <Typography.Paragraph type="secondary">
            AI mapping will read the file into an individual invoice for you to review.
          </Typography.Paragraph>
          <FileUploadDropzone
            uploading={uploadMutation.isPending}
            uploadingText="Uploading and running AI mapping…"
            onFileSelected={(file) => uploadMutation.mutate(file)}
          />
        </Card>
      )}
    </Space>
  );
}
