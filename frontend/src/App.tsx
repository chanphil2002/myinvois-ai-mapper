import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Grid, Layout, Menu } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import BrandLogo from './components/BrandLogo';
import BottomTabBar from './components/BottomTabBar';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import { useTheme, SURFACE } from './theme/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import MappingReview from './pages/MappingReview';
import Submissions from './pages/Submissions';
import ConsolidationBuilder from './pages/ConsolidationBuilder';
import ConsolidatedInvoiceReview from './pages/ConsolidatedInvoiceReview';
import CreateInvoice from './pages/create/CreateInvoice';
import CreateIndividual from './pages/create/CreateIndividual';
import CreateConsolidated from './pages/create/CreateConsolidated';
import Billing from './pages/Billing';

const { Header, Content, Sider } = Layout;

// Primary navigation destinations (sidebar on desktop, bottom tabs on mobile). Pages not listed
// here (invoice detail, create sub-steps) are drill-downs and show a Back button instead.
const TAB_ROOTS = ['/', '/create', '/submissions', '/billing', '/settings'];
// These pages render their own step-up Back button (they have internal steps), so the global
// layout Back is suppressed to avoid showing two back links.
const PAGE_MANAGES_BACK = ['/create/individual', '/create/consolidated'];

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, logout } = useAuth();
  const { isDark } = useTheme();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;

  // Keep "Create Invoice" highlighted across the whole create flow (type picker + per-type pages).
  const selectedKey = location.pathname.startsWith('/create') ? '/create' : location.pathname;
  const showBack = !TAB_ROOTS.includes(location.pathname) && !PAGE_MANAGES_BACK.includes(location.pathname);

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
    <Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/create" element={<CreateInvoice />} />
      <Route path="/create/individual" element={<CreateIndividual />} />
      <Route path="/create/consolidated" element={<CreateConsolidated />} />
      <Route path="/mapped-invoices/:id" element={<MappingReview />} />
      <Route path="/submissions" element={<Submissions />} />
      <Route path="/consolidate" element={<ConsolidationBuilder />} />
      <Route path="/consolidated-invoices/:id" element={<ConsolidatedInvoiceReview />} />
      <Route path="/billing" element={<Billing />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
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
          <a onClick={logout} style={{ color: '#3b5bdb', fontWeight: 500 }}>
            Log out
          </a>
        </div>
        <Content style={{ margin: 16, paddingBottom: 'calc(76px + env(safe-area-inset-bottom))' }}>
          {backButton}
          {routes}
        </Content>
        <BottomTabBar />
      </Layout>
    );
  }

  // ---- Desktop: fixed sidebar ----
  const items = [
    { key: '/', label: <Link to="/">Dashboard</Link> },
    { key: '/create', label: <Link to="/create">Create Invoice</Link> },
    { key: '/submissions', label: <Link to="/submissions">Submissions</Link> },
    { key: '/billing', label: <Link to="/billing">Billing</Link> },
    { key: '/settings', label: <Link to="/settings">MyInvois Settings</Link> },
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
        <Header style={{ background: surface.header, display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '0 20px', borderBottom: `1px solid ${surface.border}`, boxShadow: isDark ? 'none' : '0 1px 2px rgba(16,24,40,0.04)' }}>
          <span>{email}</span>
          <a onClick={logout}>Log out</a>
        </Header>
        <Content style={{ margin: 24 }}>
          <div style={{ maxWidth: 1080 }}>
            {backButton}
            {routes}
          </div>
        </Content>
      </Layout>
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
