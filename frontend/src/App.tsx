import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation, useNavigate } from 'react-router-dom';
import { Button, Drawer, Grid, Layout, Menu } from 'antd';
import { ArrowLeftOutlined, MenuOutlined } from '@ant-design/icons';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
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

function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, logout } = useAuth();
  const screens = Grid.useBreakpoint();
  const isMobile = !screens.lg;
  const [drawerOpen, setDrawerOpen] = useState(false);

  const items = [
    { key: '/', label: <Link to="/">Dashboard</Link> },
    { key: '/create', label: <Link to="/create">Create Invoice</Link> },
    { key: '/submissions', label: <Link to="/submissions">Submissions</Link> },
    { key: '/billing', label: <Link to="/billing">Billing</Link> },
    { key: '/settings', label: <Link to="/settings">MyInvois Settings</Link> },
  ];

  // Keep "Create Invoice" highlighted across the whole create flow (type picker + per-type pages).
  const selectedKey = location.pathname.startsWith('/create') ? '/create' : location.pathname;

  const navMenu = (
    <Menu
      theme="dark"
      mode="inline"
      selectedKeys={[selectedKey]}
      items={items}
      onClick={() => setDrawerOpen(false)}
    />
  );
  const brand = <div style={{ color: 'white', padding: 16, fontWeight: 600 }}>AI MyInvois Mapper</div>;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Desktop: fixed sidebar. Mobile: a drawer opened from the header's menu button, so the nav
          is a proper slide-over instead of antd's push-sider (which collapses to an unusable strip). */}
      {!isMobile && (
        <Sider>
          {brand}
          {navMenu}
        </Sider>
      )}
      {isMobile && (
        <Drawer
          placement="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={240}
          closable={false}
          styles={{ body: { padding: 0, background: '#001529' } }}
        >
          {brand}
          {navMenu}
        </Drawer>
      )}
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, padding: '0 16px' }}>
          {isMobile ? (
            <Button type="text" icon={<MenuOutlined />} onClick={() => setDrawerOpen(true)} aria-label="Open menu" />
          ) : (
            <span />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span>{email}</span>
            <a onClick={logout}>Log out</a>
          </div>
        </Header>
        <Content style={{ margin: 24 }}>
          {/* Constrain content so forms/sections don't stretch across very wide screens, and keep
              everything left-aligned. A back button is shown on every page except the Dashboard. */}
          <div style={{ maxWidth: 1080 }}>
            {location.pathname !== '/' && (
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate(-1)}
                style={{ marginBottom: 16, paddingLeft: 0 }}
              >
                Back
              </Button>
            )}
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
