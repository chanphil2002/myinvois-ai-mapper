import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Layout, Menu, Spin, Tooltip } from 'antd';
import { ArrowLeftOutlined, BulbOutlined, MoonOutlined } from '@ant-design/icons';
import BrandLogo from './components/BrandLogo';
import NotificationBell from './components/NotificationBell';
import BottomTabBar from './components/BottomTabBar';
import { useIsMobile } from './hooks/useIsMobile';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { useTheme } from './theme/ThemeContext';
import { UploadBanner } from './upload/UploadContext';
import Login from './pages/Login';
import Register from './pages/Register';

const { Header, Content, Sider } = Layout;

// Pages load on demand (one small chunk per screen) so phones download only what they open.
const Support = lazy(() => import('./pages/Support'));
const ParsingInvoice = lazy(() => import('./pages/ParsingInvoice'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Settings = lazy(() => import('./pages/Settings'));
const MappingReview = lazy(() => import('./pages/MappingReview'));
const Submissions = lazy(() => import('./pages/Submissions'));
const ConsolidatedInvoiceReview = lazy(() => import('./pages/ConsolidatedInvoiceReview'));
const CreateInvoice = lazy(() => import('./pages/create/CreateInvoice'));
const CreateIndividual = lazy(() => import('./pages/create/CreateIndividual'));
const CreateConsolidated = lazy(() => import('./pages/create/CreateConsolidated'));
const Billing = lazy(() => import('./pages/Billing'));


// Primary navigation destinations (sidebar on desktop, bottom tabs on mobile). Pages not listed
// here (invoice detail, create sub-steps) are drill-downs and show a Back button instead.
const TAB_ROOTS = ['/', '/create', '/submissions', '/billing', '/settings', '/support'];
// These pages render their own step-up Back button (they have internal steps), so the global
// layout Back is suppressed to avoid showing two back links.
const PAGE_MANAGES_BACK = ['/create/individual', '/create/consolidated'];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, logout } = useAuth();
  const { isDark, toggle, palette: surface } = useTheme();

  const themeToggle = (
    <Tooltip title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}>
      <Button
        type="text"
        shape="circle"
        aria-label="Toggle theme"
        icon={isDark ? <BulbOutlined /> : <MoonOutlined />}
        onClick={toggle}
      />
    </Tooltip>
  );
  const isMobile = useIsMobile();

  // Keep "Create Invoice" highlighted across the whole create flow (type picker + per-type pages).
  const selectedKey = location.pathname.startsWith('/create') ? '/create' : location.pathname;
  // On phones Support is reached from Settings (it isn't a tab), so it gets a Back button there.
  const roots = isMobile ? TAB_ROOTS.filter((r) => r !== '/support') : TAB_ROOTS;
  const showBack = !roots.includes(location.pathname) && !PAGE_MANAGES_BACK.includes(location.pathname);

  const backButton = showBack && (
    <Button
      type="text"
      icon={<ArrowLeftOutlined />}
      onClick={() => navigate(-1)}
      style={{ marginBottom: 12, paddingLeft: 0 }}
    >
      Back
    </Button>
  );

  const routes = (
    <Suspense
      fallback={
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <Spin />
        </div>
      }
    >
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateInvoice />} />
      <Route path="/create/individual" element={<CreateIndividual />} />
      <Route path="/create/consolidated" element={<CreateConsolidated />} />
      <Route path="/mapped-invoices/:id" element={<MappingReview />} />
      <Route path="/parsing/:jobId" element={<ParsingInvoice />} />
      <Route path="/submissions" element={<Submissions />} />
      <Route path="/consolidate" element={<Navigate to="/submissions?tab=consolidated" replace />} />
      <Route path="/consolidated-invoices/:id" element={<ConsolidatedInvoiceReview />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/support" element={<Support />} />
    </Routes>
    </Suspense>
  );

  // ---- Mobile: safe-area header + native bottom tab bar (no hidden hamburger) ----
  if (isMobile) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <div
          style={{
            background: surface.header,
            borderBottom: `1px solid ${surface.border}`,
            padding: 'calc(env(safe-area-inset-top) + 10px) 16px 10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            zIndex: 50,
          }}
        >
          <BrandLogo dark={isDark} />
          {/* Log out lives in Settings → Account on phones, away from accidental taps. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <NotificationBell />
            {themeToggle}
          </div>
        </div>
        <Content style={{ margin: 16, paddingBottom: 'calc(112px + env(safe-area-inset-bottom))' }}>
          {backButton}
          {routes}
        </Content>
        <BottomTabBar />
        <UploadBanner />
      </Layout>
    );
  }

  // ---- Desktop: fixed sidebar ----
  const items = [
    { key: '/', label: <Link to="/">Dashboard</Link> },
    { key: '/create', label: <Link to="/create">Create Invoice</Link> },
    { key: '/submissions', label: <Link to="/submissions">Submissions</Link> },
    { key: '/billing', label: <Link to="/billing">Billing</Link> },
    { key: '/settings', label: <Link to="/settings">Settings</Link> },
    { key: '/support', label: <Link to="/support">Contact Us</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider>
        <div style={{ padding: '20px 16px 12px' }}>
          <BrandLogo dark />
        </div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: surface.header, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '0 20px', borderBottom: `1px solid ${surface.border}`, boxShadow: surface.shadow }}>
          <NotificationBell />
          {themeToggle}
          <span>{email}</span>
          <a onClick={logout} style={{ fontWeight: 500 }}>Log out</a>
        </Header>
        <Content style={{ margin: 24, paddingBottom: 48 }}>
          <div style={{ maxWidth: 1080, margin: '0 auto' }}>
            {backButton}
            {routes}
          </div>
        </Content>
      </Layout>
      <UploadBanner />
    </Layout>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/*" element={<AppLayout />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
