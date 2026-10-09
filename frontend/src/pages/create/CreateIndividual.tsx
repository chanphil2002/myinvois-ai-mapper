import { useState } from 'react';
import { Button, Card, Col, Input, Row, Space, Typography, message } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import FileUploadDropzone from '../../components/FileUploadDropzone';
import { createManualInvoice, runMapping, uploadDocument } from '../../api/endpoints';
import { useUpload } from '../../upload/UploadContext';

type Method = null | 'manual' | 'upload';

export default function CreateIndividual() {
  const navigate = useNavigate();
  const { startJob } = useUpload();
  const [method, setMethod] = useState<Method>(null);
  const [name, setName] = useState('');

  const manualMutation = useMutation({
    mutationFn: () =>
      createManualInvoice({
        invoiceName: name.trim() || null,
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

  // Upload + AI mapping run in the background so you can keep browsing; a banner tracks progress.
  const startUpload = (file: File) => {
    startJob({
      label: `Parsing ${file.name}`,
      run: async () => {
        const doc = await uploadDocument(file);
        const invoice = await runMapping(doc.id);
        return { link: { to: `/mapped-invoices/${invoice.id}`, text: 'Review invoice' } };
      },
    });
    message.info('Uploading in the background — you can keep working. Track it from the banner.');
    navigate('/');
  };

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
          <div style={{ maxWidth: 360, marginBottom: 16 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Invoice name (optional)
            </Typography.Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. March retainer — Acme Sdn Bhd"
              style={{ marginTop: 4 }}
              onPressEnter={() => manualMutation.mutate()}
            />
            <Typography.Text type="secondary" style={{ fontSize: 11 }}>
              Leave blank to auto-name it (e.g. Invoice-{new Date().toISOString().slice(0, 10)}#…).
            </Typography.Text>
          </div>
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
          <FileUploadDropzone uploading={false} onFileSelected={startUpload} />
        </Card>
      )}
    </Space>
  );
}
