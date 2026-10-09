import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { App as AntApp } from 'antd';
import App from './App';
import { AuthProvider } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { UploadProvider } from './upload/UploadContext';
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
    <ThemeProvider>
      <AntApp>
        <QueryClientProvider client={queryClient}>
          <BrowserRouter>
            <AuthProvider>
              <UploadProvider>
                <App />
              </UploadProvider>
            </AuthProvider>
          </BrowserRouter>
        </QueryClientProvider>
      </AntApp>
    </ThemeProvider>
  </React.StrictMode>,
);
