import { Tag } from 'antd';
import { LoadingOutlined } from '@ant-design/icons';
import { useTheme } from '../theme/ThemeContext';
import type { Palette } from '../theme/palette';

// Each status maps to a tone from the shared palette, so tags match the theme in both modes:
// neutral = not started / editing, info = ready for the user's action, progress = waiting on
// LHDN or the AI, success / warning / error = final outcomes.
type Tone = 'neutral' | 'info' | 'progress' | 'success' | 'warning' | 'error';

const TONES: Record<string, Tone> = {
  DRAFT: 'neutral',
  CONFIRMED: 'info',
  SUBMITTED: 'progress',
  ACCEPTED: 'success',
  REJECTED: 'error',
  PENDING: 'neutral',
  IN_PROGRESS: 'progress',
  PARSING: 'progress',
  VALID: 'success',
  INVALID: 'error',
  PARTIALLY_VALID: 'warning',
  PAID: 'success',
  ACTIVE: 'success',
  CANCELLED: 'neutral',
};

// Human-friendly labels shown to the user (the raw enum names are developer-facing).
const LABELS: Record<string, string> = {
  DRAFT: 'Editing',
  CONFIRMED: 'Reviewing',
  SUBMITTED: 'Submitted',
  ACCEPTED: 'Accepted',
  REJECTED: 'Failed',
  PENDING: 'Pending',
  IN_PROGRESS: 'In progress',
  PARSING: 'Parsing…',
  VALID: 'Valid',
  INVALID: 'Invalid',
  PARTIALLY_VALID: 'Partial',
  PAID: 'Paid',
  ACTIVE: 'Active',
  CANCELLED: 'Cancelled',
};

function toneStyle(tone: Tone, p: Palette) {
  if (tone === 'neutral') return { color: p.textSecondary, background: p.subtle, borderColor: p.border };
  // "progress" shares the amber of the dashboard's "In progress" tile.
  const fg = { info: p.info, progress: p.warning, success: p.success, warning: p.warning, error: p.error }[tone];
  const bg = { info: p.infoSoft, progress: p.warningSoft, success: p.successSoft, warning: p.warningSoft, error: p.errorSoft }[tone];
  return { color: fg, background: bg, borderColor: `${fg}55` }; // tone colours are hex, so append ~33% alpha
}

/** The user-facing name for a status (same text the tag shows) — use it anywhere a status is listed. */
export const statusLabel = (status: string) => LABELS[status] ?? status;

export default function StatusTag({ status }: { status?: string | null }) {
  const { palette } = useTheme();
  if (!status) return null;
  const tone = TONES[status] ?? 'neutral';
  return (
    <Tag
      icon={status === 'PARSING' || status === 'IN_PROGRESS' ? <LoadingOutlined spin /> : undefined}
      style={{ ...toneStyle(tone, palette), marginInlineEnd: 0, fontWeight: 500 }}
    >
      {LABELS[status] ?? status}
    </Tag>
  );
}
