import type { ReactNode } from 'react';
import { Card, Typography } from 'antd';
import BrandLogo from './BrandLogo';
import { useTheme } from '../theme/ThemeContext';

/** Shared frame for the signed-out screens (log in, register): branded, safe-area aware, centred. */
export default function AuthShell({ subtitle, children, footer }: { subtitle: string; children: ReactNode; footer: ReactNode }) {
  const { isDark, palette } = useTheme();
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100dvh',
        boxSizing: 'border-box',
        paddingTop: 'max(16px, env(safe-area-inset-top))',
        paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
        paddingInline: 16,
        background: isDark
          ? `radial-gradient(1200px 600px at 50% -10%, ${palette.primarySoft}, transparent 60%), ${palette.bg}`
          : `radial-gradient(1200px 600px at 50% -10%, #d1fae5, transparent 60%), ${palette.bg}`,
      }}
    >
      <Card
        style={{
          width: '100%',
          maxWidth: 400,
          boxShadow: isDark ? 'none' : '0 12px 40px rgba(28,28,26,0.10)',
          border: `1px solid ${palette.border}`,
        }}
        styles={{ body: { padding: 28 } }}
      >
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <BrandLogo size="lg" dark={isDark} />
        </div>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center', marginBottom: 24 }}>
          {subtitle}
        </Typography.Paragraph>
        {children}
        <div style={{ marginTop: 20, textAlign: 'center', color: palette.textSecondary }}>{footer}</div>
      </Card>
    </div>
  );
}
