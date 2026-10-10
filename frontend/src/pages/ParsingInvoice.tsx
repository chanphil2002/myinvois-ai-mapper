import { Button, Card, Result, Spin, Typography } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useUpload } from '../upload/UploadContext';

/**
 * Loading view for a freshly-uploaded invoice that is still being parsed in the background.
 * Redirects to the real invoice once the job finishes.
 */
export default function ParsingInvoice() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const { jobs } = useUpload();
  const job = jobs.find((j) => j.id === jobId);

  // The job already finished and redirected/was dismissed (e.g. after a reload) — go to Submissions.
  if (!job) {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <Result
          status="info"
          title="This upload has finished"
          subTitle="We're no longer tracking it here — find your invoice under Submissions."
          extra={
            <Button type="primary" onClick={() => navigate('/submissions')}>
              Go to Submissions
            </Button>
          }
        />
      </div>
    );
  }

  if (job.status === 'done' && job.link) {
    return <Navigate to={job.link.to} replace />;
  }

  if (job.status === 'error') {
    return (
      <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
        <Result
          status="error"
          title="Parsing failed"
          subTitle={job.error}
          extra={
            <Button type="primary" onClick={() => navigate('/submissions')}>
              Back to Submissions
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 560, margin: '0 auto', width: '100%' }}>
      <Card>
        <div style={{ textAlign: 'center', padding: '28px 12px' }}>
          <Spin indicator={<LoadingOutlined style={{ fontSize: 36 }} spin />} />
          <Typography.Title level={4} style={{ marginTop: 20, marginBottom: 6 }}>
            Still parsing your document…
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            {job.label}. This opens automatically when it's ready — you can keep browsing in the meantime.
          </Typography.Paragraph>
        </div>
      </Card>
    </div>
  );
}
