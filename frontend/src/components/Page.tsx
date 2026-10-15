import type { ReactNode } from 'react';
import { Space, theme } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';
import { TAB_BAR_HEIGHT } from './BottomTabBar';

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
  const mobile = useIsMobile();
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
          {extra && !mobile && <Space wrap>{extra}</Space>}
        </div>
        {subtitle && (
          <div style={{ marginTop: 6, color: token.colorTextSecondary, fontSize: 14, lineHeight: 1.6 }}>{subtitle}</div>
        )}
      </div>
      {children}
      {extra && mobile && (
        // Phones: page actions (Confirm / Submit / Save) stay pinned just above the tab bar, within
        // thumb reach, instead of scrolling away at the top of a long form.
        <div
          className="page-sticky-actions"
          style={{
            position: 'sticky',
            bottom: `calc(${TAB_BAR_HEIGHT}px + max(env(safe-area-inset-bottom), 6px) + 10px)`,
            zIndex: 20,
            display: 'flex',
            gap: 8,
            padding: 10,
            borderRadius: 14,
            background: token.colorBgElevated,
            border: `1px solid ${token.colorBorderSecondary}`,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
          }}
        >
          {extra}
        </div>
      )}
    </div>
  );
}
