import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import { Button, Card, Grid, Progress, Spin, Typography, theme } from 'antd';
import { CheckCircleTwoTone, CloseCircleTwoTone, CloseOutlined, DownOutlined, LoadingOutlined, UpOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useTheme } from '../theme/ThemeContext';

interface JobLink {
  to: string;
  text: string;
}

export type UploadKind = 'individual' | 'consolidated';

export interface UploadJob {
  id: string;
  kind: UploadKind;
  label: string;
  /** Consolidated draft this job feeds; such jobs are shown inside the draft, not as a list row. */
  draftId?: number;
  /** Jobs sharing a group (e.g. several files dropped into one draft) collapse into one banner. */
  group?: string;
  /** One-line result shown when done (e.g. "12 sales added"). */
  summary?: string;
  /** Data the job produced, for the page that started it (e.g. extracted sales to review). */
  result?: unknown;
  status: 'running' | 'done' | 'error';
  link?: JobLink;
  error?: string;
}

interface UploadContextValue {
  jobs: UploadJob[];
  /** Run an upload/parse in the background; the banner tracks it across navigation. */
  startJob: (opts: {
    kind: UploadKind;
    label: string;
    draftId?: number;
    group?: string;
    run: () => Promise<{ link?: JobLink; summary?: string; result?: unknown } | void>;
  }) => string;
  dismiss: (id: string) => void;
}

const UploadContext = createContext<UploadContextValue | null>(null);

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `job-${Date.now()}-${Math.random()}`;

export function UploadProvider({ children }: { children: ReactNode }) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const queryClient = useQueryClient();

  const startJob: UploadContextValue['startJob'] = useCallback(
    ({ kind, label, draftId, group, run }) => {
      const id = newId();
      setJobs((j) => [...j, { id, kind, label, draftId, group, status: 'running' }]);
      run()
        .then((res) => {
          setJobs((j) => j.map((x) => (x.id === id ? { ...x, status: 'done', link: res?.link, summary: res?.summary, result: res?.result } : x)));
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
  const { palette, isDark } = useTheme();
  return (
    <Card size="small" styles={{ body: { padding: 12 } }} style={{ boxShadow: isDark ? '0 0 0 1px ' + palette.borderStrong : '0 6px 20px rgba(28,28,26,0.14)', background: palette.elevated }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ fontSize: 18, lineHeight: 1, marginTop: 1 }}>
          {job.status === 'running' && <Spin indicator={<LoadingOutlined spin />} size="small" />}
          {job.status === 'done' && <CheckCircleTwoTone twoToneColor={palette.success} />}
          {job.status === 'error' && <CloseCircleTwoTone twoToneColor={palette.error} />}
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
            {job.status === 'done' && (job.summary ?? job.label)}
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

/** Strip the "Extracting " / "Importing " verb so the per-file list shows just the file name. */
const fileName = (label: string) => label.replace(/^(Extracting|Importing|Parsing)\s+/, '');

/** Several files uploaded together: one card with an n-of-m progress ring and an expandable file list. */
function GroupCard({ jobs, onClose }: { jobs: UploadJob[]; onClose: () => void }) {
  const { token } = theme.useToken();
  const { palette, isDark } = useTheme();
  const [open, setOpen] = useState(false);
  const total = jobs.length;
  const failed = jobs.filter((j) => j.status === 'error').length;
  const finished = jobs.filter((j) => j.status !== 'running').length;
  const running = finished < total;
  const link = jobs.find((j) => j.link)?.link;

  const title = running
    ? `Processing ${total} files`
    : failed === 0
      ? `${total} files processed`
      : `${total - failed} of ${total} processed · ${failed} failed`;
  const subtitle = running ? `${finished} of ${total} done — you can keep working.` : failed ? 'Open the list to see what failed.' : 'All done.';

  return (
    <Card
      size="small"
      styles={{ body: { padding: 12 } }}
      style={{ boxShadow: isDark ? '0 0 0 1px ' + palette.borderStrong : '0 6px 20px rgba(28,28,26,0.14)', background: palette.elevated }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <Progress
          type="circle"
          size={40}
          percent={Math.round((finished / total) * 100)}
          status={!running && failed ? 'exception' : undefined}
          strokeColor={!running && failed ? palette.error : running ? palette.primary : palette.success}
          format={() => (
            <span style={{ fontSize: 11, fontWeight: 600, color: token.colorText }}>
              {finished}/{total}
            </span>
          )}
        />
        <div style={{ minWidth: 0, flex: 1 }}>
          <Typography.Text strong style={{ display: 'block' }}>
            {title}
          </Typography.Text>
          <div style={{ fontSize: 12, color: token.colorTextSecondary }}>{subtitle}</div>
          <div style={{ display: 'flex', gap: 12, marginTop: 2 }}>
            <a onClick={() => setOpen(!open)} style={{ fontSize: 13 }}>
              {open ? 'Hide files' : 'Show files'} {open ? <UpOutlined /> : <DownOutlined />}
            </a>
            {!running && link && (
              <Link to={link.to} onClick={onClose} style={{ fontSize: 13, fontWeight: 500 }}>
                {link.text} →
              </Link>
            )}
          </div>
        </div>
        <Button type="text" size="small" icon={<CloseOutlined />} onClick={onClose} aria-label="Dismiss" />
      </div>
      {open && (
        <div style={{ marginTop: 10, maxHeight: 180, overflowY: 'auto', borderTop: `1px solid ${palette.border}`, paddingTop: 8 }}>
          {jobs.map((j) => (
            <div key={j.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '3px 0', fontSize: 12 }}>
              <span style={{ flex: 'none', marginTop: 1 }}>
                {j.status === 'running' && <Spin indicator={<LoadingOutlined spin style={{ fontSize: 12 }} />} size="small" />}
                {j.status === 'done' && <CheckCircleTwoTone twoToneColor={palette.success} />}
                {j.status === 'error' && <CloseCircleTwoTone twoToneColor={palette.error} />}
              </span>
              <div style={{ minWidth: 0 }}>
                <div style={{ overflowWrap: 'anywhere' }}>{fileName(j.label)}</div>
                {(j.summary || j.error) && (
                  <div style={{ color: j.error ? palette.error : token.colorTextSecondary, overflowWrap: 'anywhere' }}>
                    {j.error ?? j.summary}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/** Fixed, closeable banner listing in-flight (and just-finished) background uploads — one card per group. */
export function UploadBanner() {
  const { jobs, dismiss } = useUpload();
  const screens = Grid.useBreakpoint();
  const mobile = !screens.lg;
  // Closing a group that's still running only hides it (the jobs keep going); it reappears if
  // more files join the group. Finished groups are dismissed for good.
  const [hidden, setHidden] = useState<Record<string, number>>({});

  const groups: { key: string; jobs: UploadJob[] }[] = [];
  for (const j of jobs) {
    const key = j.group ?? j.id;
    const g = groups.find((x) => x.key === key);
    if (g) g.jobs.push(j);
    else groups.push({ key, jobs: [j] });
  }
  const visible = groups.filter((g) => hidden[g.key] !== g.jobs.length);
  if (visible.length === 0) return null;

  const close = (g: { key: string; jobs: UploadJob[] }) => {
    if (g.jobs.some((j) => j.status === 'running')) setHidden((h) => ({ ...h, [g.key]: g.jobs.length }));
    else g.jobs.forEach((j) => dismiss(j.id));
  };

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
        width: mobile ? undefined : 380,
        marginLeft: 'auto',
      }}
    >
      {visible.map((g) =>
        g.jobs.length > 1 ? (
          <GroupCard key={g.key} jobs={g.jobs} onClose={() => close(g)} />
        ) : (
          <JobCard key={g.key} job={g.jobs[0]} onClose={() => close(g)} />
        ),
      )}
    </div>
  );
}
