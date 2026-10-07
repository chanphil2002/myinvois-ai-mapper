import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp, ConfigProvider, theme as antdTheme } from 'antd';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import './index.css';

const queryClient = new QueryClient();

// Shared brand tokens (also referenced from components via these exports).
export const BRAND = {
  primary: '#3b5bdb',
  primaryDeep: '#1e3a8a',
  sider: '#0f172a',
  siderActive: '#3b5bdb',
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ConfigProvider
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: BRAND.primary,
          colorLink: BRAND.primary,
          borderRadius: 10,
          colorBgLayout: '#f4f6fb',
          fontFamily:
            "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'PingFang SC', sans-serif",
        },
        components: {
          Layout: { siderBg: BRAND.sider, headerBg: '#ffffff', bodyBg: '#f4f6fb' },
          Menu: {
            darkItemBg: BRAND.sider,
            darkSubMenuItemBg: BRAND.sider,
            darkItemSelectedBg: BRAND.siderActive,
            darkItemHoverBg: 'rgba(255,255,255,0.08)',
            itemBorderRadius: 8,
            itemMarginInline: 8,
          },
          Card: { borderRadiusLG: 14, boxShadowTertiary: '0 1px 3px rgba(16,24,40,0.06)' },
          Button: { controlHeight: 38, borderRadius: 8, fontWeight: 500 },
          Table: { headerBg: '#f8fafc', borderRadius: 10 },
          Statistic: { contentFontSize: 30 },
        },
      }}
    >
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <App />
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  </React.StrictMode>,
);
