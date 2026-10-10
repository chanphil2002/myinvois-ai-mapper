import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Card, Grid, Spin, Typography, theme } from 'antd';
import { CheckCircleTwoTone, CloseCircleTwoTone, CloseOutlined, LoadingOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

interface JobLink {
  to: string;
  text: string;
}

export type UploadKind = 'individual' | 'consolidated';

export interface UploadJob {
  id: string;
  kind: UploadKind;
  label: string;
  status: 'running' | 'done' | 'error';
  link?: JobLink;
  error?: string;
}

interface UploadContextValue {
  jobs: UploadJob[];
  /** Run an upload/parse in the background; the banner tracks it across navigation. */
  startJob: (opts: { kind: UploadKind; label: string; run: () => Promise<{ link?: JobLink } | void> }) => string;
  dismiss: (id: string) => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random()}`;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const queryClient = useQueryClient();

  const startJob: UploadContextValue['startJob'] = useCallback(
    ({ kind, label, run }) => {
      const id = newId();
      setJobs((j) => [...j, { id, kind, label, status: 'running' }]);
      run()
        .then((res) => {
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'done', link: res?.link } : x)));
          // Refresh anything that may now have new data.
          ['documents', 'mapped-invoices', 'consolidated-invoices', 'eligible-transactions', 'usage'].forEach((k) =>
            queryClient.invalidateQueries({ queryKey: [k] }),
          );
        })
        .catch((err) => {
          setJobs((j) =>
            j.map((x) =>
              x.id === id ? { ...x, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' } : x,
            ),
          );
        });
      return id;
    },
    [queryClient],
  );

  const dismiss = useCallback((id: string) => setJobs((j) => j.filter((x) => x.id !== id)), []);

  return <UploadContext.Provider value={{ jobs, startJob, dismiss }}>{children}</UploadContext.Provider>;
}

export function useUpload(): UploadContextValue {
  const ctx = useContext(UploadContext);
  if (!ctx) throw new Error('useUpload must be used within UploadProvider');
  return ctx;
}

function JobCard({ job, onClose }: { job: UploadJob; onClose: () => void }) {
  const { token } = theme.useToken();
  return (
    <Card size="small" styles={{ body: { padding: 12 } }} style={{ boxShadow: '0 6px 20px rgba(16,24,40,0.18)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>
          {job.status === 'running' && <Spin indicator={<LoadingOutlined spin />} size="small" />}
          {job.status === 'done' && <CheckCircleTwoTone twoToneColor="#16a34a" />}
          {job.status === 'error' && <CloseCircleTwoTone twoToneColor="#dc2626" />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text strong ellipsis style={{ display: 'block' }}>
            {job.status === 'running'
              ? job.label
              : job.status === 'done'
                ? 'Done'
                : 'Upload failed'}
          </Typography.Text>
          <div style={{ fontSize: 12, color: token.colorTextSecondary, wordBreak: 'break-word' }}>
            {job.status === 'running' && 'Uploading & parsing — you can keep working.'}
            {job.status === 'done' && (job.label.length > 0 ? job.label : 'Finished')}
            {job.status === 'error' && job.error}
          </div>
          {job.status === 'done' && job.link && (
            <Link to={job.link.to} onClick={onClose} style={{ fontSize: 13, fontWeight: 500 }}>
              {job.link.text} →
            </Link>
          )}
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="Dismiss" />
      </div>
    </Card>
  );
}

/** Fixed, closeable banner listing in-flight (and just-finished) background uploads. */
export function UploadBanner() {
  const { jobs, dismiss } = useUpload();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.lg;
  if (jobs.length === 0) return null;
  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        left: mobile ? 16 : 'auto',
        // Sit above the mobile bottom tab bar.
        bottom: mobile ? 'calc(84px + env(safe-area-inset-bottom))' : 16,
        zIndex: 2000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 380,
        marginLeft: 'auto',
      }}
    >
      {jobs.map((j) => (
        <JobCard key={j.id} job={j} onClose={() => dismiss(j.id)} />
      ))}
    </div>
  );
}
