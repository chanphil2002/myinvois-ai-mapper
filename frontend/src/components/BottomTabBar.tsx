import { Link, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  HomeFilled,
  PlusCircleOutlined,
  PlusCircleFilled,
  ProfileOutlined,
  ProfileFilled,
  WalletOutlined,
  WalletFilled,
  SettingOutlined,
  SettingFilled,
} from '@ant-design/icons';
import type { ReactNode } from 'react';

const TABS: { key: string; label: string; icon: ReactNode; active: ReactNode }[] = [
  { key: '/', label: 'Home', icon: <HomeOutlined />, active: <HomeFilled /> },
  { key: '/create', label: 'Create', icon: <PlusCircleOutlined />, active: <PlusCircleFilled /> },
  { key: '/submissions', label: 'Submissions', icon: <ProfileOutlined />, active: <ProfileFilled /> },
  { key: '/billing', label: 'Billing', icon: <WalletOutlined />, active: <WalletFilled /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined />, active: <SettingFilled /> },
];

/** iOS-style fixed bottom tab bar for primary navigation on mobile. */
export default function BottomTabBar() {
  const { pathname } = useLocation();
  const isActive = (key: string) => (key === '/' ? pathname === '/' : pathname.startsWith(key));

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: '#ffffff',
        borderTop: '1px solid #eef1f6',
        boxShadow: '0 -1px 8px rgba(16,24,40,0.05)',
        paddingBottom: 'env(safe-area-inset-bottom)',
        display: 'flex',
      }}
    >
      {TABS.map((t) => {
        const on = isActive(t.key);
        return (
          <Link
            key={t.key}
            to={t.key}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              padding: '9px 0 7px',
              color: on ? '#3b5bdb' : '#94a3b8',
              fontSize: 21,
              lineHeight: 1,
            }}
          >
            {on ? t.active : t.icon}
            <span style={{ fontSize: 10.5, fontWeight: on ? 600 : 500 }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
