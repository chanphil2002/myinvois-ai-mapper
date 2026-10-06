import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
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

const { Header, Content, Sider } = Layout;

function AppLayout() {
  const location = useLocation();
  const { email, logout } = useAuth();

  const items = [
    { key: '/', label: <Link to="/">Dashboard</Link> },
    { key: '/create', label: <Link to="/create">Create Invoice</Link> },
    { key: '/submissions', label: <Link to="/submissions">Submissions</Link> },
    { key: '/settings', label: <Link to="/settings">MyInvois Settings</Link> },
  ];

  // Keep "Create Invoice" highlighted across the whole create flow (type picker + per-type pages).
  const selectedKey = location.pathname.startsWith('/create') ? '/create' : location.pathname;

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: 'white', padding: 16, fontWeight: 600 }}>AI MyInvois Mapper</div>
        <Menu theme="dark" mode="inline" selectedKeys={[selectedKey]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '0 24px' }}>
          <span>{email}</span>
          <a onClick={logout}>Log out</a>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/create" element={<CreateInvoice />} />
            <Route path="/create/individual" element={<CreateIndividual />} />
            <Route path="/create/consolidated" element={<CreateConsolidated />} />
            <Route path="/mapped-invoices/:id" element={<MappingReview />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/consolidate" element={<ConsolidationBuilder />} />
            <Route path="/consolidated-invoices/:id" element={<ConsolidatedInvoiceReview />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
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
