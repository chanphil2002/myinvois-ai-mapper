import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';
import { PALETTES } from './palette';
import type { Palette } from './palette';
import { useIsMobile } from '../hooks/useIsMobile';

type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  isDark: boolean;
  /** Current mode's colours, for custom inline-styled UI. */
  palette: Palette;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'mytax-theme';

function readInitial(): Mode {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<Mode>(readInitial);
  const isDark = mode === 'dark';
  const p = PALETTES[mode];
  // Touch layouts get 44px controls (Apple HIG / Material minimum tap target) app-wide.
  const touch = useIsMobile();

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    // Keep the page/overscroll background in step with the theme.
    document.body.style.background = p.bg;
    document.documentElement.style.colorScheme = mode;
    // Browser/PWA status bar colour follows the in-app theme, not just the OS setting.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', p.header));
  }, [mode, p]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, palette: p, toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')), setMode }),
    [mode, isDark, p],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: p.primary,
            colorInfo: p.info,
            colorSuccess: p.success,
            colorWarning: p.warning,
            colorError: p.error,
            colorLink: p.link,
            colorLinkHover: p.link,
            colorTextBase: p.text,
            colorText: p.text,
            colorTextHeading: p.text,
            colorTextSecondary: p.textSecondary,
            colorTextTertiary: p.textTertiary,
            colorTextDescription: p.textSecondary,
            colorTextPlaceholder: p.textTertiary,
            colorTextDisabled: p.textDisabled,
            colorBgContainerDisabled: p.subtle,
            colorBgLayout: p.bg,
            colorBgContainer: p.card,
            colorBgElevated: p.elevated,
            colorFillAlter: p.subtle,
            colorBorder: p.borderStrong,
            colorBorderSecondary: p.border,
            colorSplit: p.border,
            borderRadius: 10,
            ...(touch ? { controlHeight: 44, controlHeightSM: 36, controlHeightLG: 48 } : {}),
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', sans-serif",
          },
          components: {
            Layout: {
              siderBg: p.sider,
              headerBg: p.header,
              bodyBg: p.bg,
            },
            Menu: {
              darkItemBg: p.sider,
              darkSubMenuItemBg: p.sider,
              darkPopupBg: p.sider,
              darkItemSelectedBg: p.siderActive,
              darkItemSelectedColor: '#ffffff',
              darkItemColor: 'rgba(255,255,255,0.72)',
              darkItemHoverBg: p.siderHover,
              itemBorderRadius: 8,
              itemMarginInline: 8,
            },
            Card: {
              borderRadiusLG: 14,
              boxShadowTertiary: p.shadow,
              // Consistent, roomy padding for every card's body and header so content never
              // hugs the border — applies app-wide instead of per-card overrides.
              bodyPadding: 20,
              bodyPaddingSM: 16,
              headerPadding: 20,
              headerPaddingSM: 16,
              headerFontSize: 16,
            },
            Button: {
              controlHeight: touch ? 44 : 38,
              controlHeightSM: touch ? 36 : 24,
              borderRadius: 8,
              fontWeight: 500,
              primaryColor: p.onPrimary,
              primaryShadow: 'none',
            },
            ...(touch
              ? {
                  Tabs: { horizontalItemPadding: '14px 0', horizontalItemPaddingSM: '12px 0' },
                  Pagination: { itemSize: 40, itemSizeSM: 36 },
                  Segmented: { controlHeight: 40 },
                }
              : {}),
            Table: {
              headerBg: p.subtle,
              headerColor: p.textSecondary,
              rowHoverBg: p.subtle,
              borderRadius: 10,
              // Even, roomier cell padding so text never hugs the cell edges — including
              // size="small" tables, whose 8px default felt cramped.
              cellPaddingBlock: 14,
              cellPaddingInline: 16,
              cellPaddingBlockMD: 12,
              cellPaddingInlineMD: 16,
              cellPaddingBlockSM: 12,
              cellPaddingInlineSM: 14,
            },
            Statistic: { contentFontSize: 30 },
          },
        }}
      >
        {children}
      </ConfigProvider>
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
