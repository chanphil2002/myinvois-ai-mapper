import type { ReactNode } from 'react';
import { Space, theme } from 'antd';

interface Props {
  title: ReactNode;
  /** Shown beside the title (e.g. a status tag). */
  tag?: ReactNode;
  subtitle?: ReactNode;
  /** Page-level actions, right-aligned (wrap under the title on narrow screens). */
  extra?: ReactNode;
  /** Optional back link rendered above the title. */
  back?: ReactNode;
  /** Constrain and centre narrow pages (forms, pickers). */
  maxWidth?: number;
  children: ReactNode;
}

/**
 * Shared page shell so every page title has the same size, weight, spacing and position,
 * and every page uses the same vertical rhythm between its sections (cards).
 */
export default function Page({ title, tag, subtitle, extra, back, maxWidth, children }: Props) {
  const { token } = theme.useToken();
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        width: '100%',
        maxWidth,
        margin: maxWidth ? '0 auto' : undefined,
      }}
    >
      <div>
        {back && <div style={{ marginBottom: 4, marginLeft: -2 }}>{back}</div>}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flexWrap: 'wrap' }}>
            <h1
              style={{
                margin: 0,
                fontSize: 24,
                fontWeight: 600,
                lineHeight: 1.3,
                color: token.colorText,
                overflowWrap: 'anywhere',
              }}
            >
              {title}
            </h1>
            {tag}
          </div>
          {extra && <Space wrap>{extra}</Space>}
        </div>
        {subtitle && (
          <div style={{ marginTop: 6, color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6 }}>{subtitle}</div>
        )}
      </div>
      {children}
    </div>
  );
}
