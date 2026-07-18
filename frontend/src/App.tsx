import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { Layout, Menu } from 'antd';
import { ProtectedRoute } from './auth/ProtectedRoute';
import { useAuth } from './auth/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Settings from './pages/Settings';
import Upload from './pages/Upload';
import MappingReview from './pages/MappingReview';
import Submissions from './pages/Submissions';

const { Header, Content, Sider } = Layout;

function AppLayout() {
  const location = useLocation();
  const { email, logout } = useAuth();

  const items = [
    { key: '/', label: <Link to="/">Dashboard</Link> },
    { key: '/upload', label: <Link to="/upload">Upload</Link> },
    { key: '/submissions', label: <Link to="/submissions">Submissions</Link> },
    { key: '/settings', label: <Link to="/settings">MyInvois Settings</Link> },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0">
        <div style={{ color: 'white', padding: 16, fontWeight: 600 }}>AI MyInvois Mapper</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]} items={items} />
      </Sider>
      <Layout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 16, padding: '0 24px' }}>
          <span>{email}</span>
          <a onClick={logout}>Log out</a>
        </Header>
        <Content style={{ margin: 24 }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/upload" element={<Upload />} />
            <Route path="/mapped-invoices/:id" element={<MappingReview />} />
            <Route path="/submissions" element={<Submissions />} />
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
