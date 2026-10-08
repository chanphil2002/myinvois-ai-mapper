import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

type Mode = 'light' | 'dark';

interface ThemeContextValue {
  mode: Mode;
  isDark: boolean;
  toggle: () => void;
  setMode: (m: Mode) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = 'mytax-theme';

const BRAND = {
  primary: '#3b5bdb',
  sider: '#0f172a',
  siderActive: '#3b5bdb',
};

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

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      /* ignore */
    }
    // Keep the page/overscroll background in step with the theme.
    document.body.style.background = isDark ? '#0b1220' : '#f4f6fb';
    document.documentElement.style.colorScheme = mode;
  }, [mode, isDark]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, isDark, toggle: () => setMode((m) => (m === 'dark' ? 'light' : 'dark')), setMode }),
    [mode, isDark],
  );

  return (
    <ThemeContext.Provider value={value}>
      <ConfigProvider
        theme={{
          algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
          token: {
            colorPrimary: BRAND.primary,
            colorLink: BRAND.primary,
            borderRadius: 10,
            colorBgLayout: isDark ? '#0b1220' : '#f4f6fb',
            fontFamily:
              "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', sans-serif",
          },
          components: {
            Layout: {
              siderBg: BRAND.sider,
              headerBg: isDark ? '#111a2e' : '#ffffff',
              bodyBg: isDark ? '#0b1220' : '#f4f6fb',
            },
            Menu: {
              darkItemBg: BRAND.sider,
              darkSubMenuItemBg: BRAND.sider,
              darkItemSelectedBg: BRAND.siderActive,
              darkItemHoverBg: 'rgba(255,255,255,0.08)',
              itemBorderRadius: 8,
              itemMarginInline: 8,
            },
            Card: {
              borderRadiusLG: 14,
              boxShadowTertiary: '0 1px 3px rgba(16,24,40,0.06)',
              // Consistent, roomy padding for every card's body and header so content never
              // hugs the border — applies app-wide instead of per-card overrides.
              bodyPadding: 20,
              bodyPaddingSM: 16,
              headerPadding: 20,
              headerPaddingSM: 16,
              headerFontSize: 16,
            },
            Button: { controlHeight: 38, borderRadius: 8, fontWeight: 500 },
            Table: {
              headerBg: isDark ? '#1a2540' : '#f8fafc',
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

export const SURFACE = {
  // Surface colours for custom (non-antd) inline-styled chrome, per mode.
  light: { header: '#ffffff', border: '#eef1f6', tabInactive: '#94a3b8' },
  dark: { header: '#111a2e', border: '#1f2a44', tabInactive: '#7488a8' },
};
