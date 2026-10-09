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
  QuestionCircleOutlined,
  QuestionCircleFilled,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useTheme, SURFACE } from '../theme/ThemeContext';

const TABS: { key: string; label: string; icon: ReactNode; active: ReactNode }[] = [
  { key: '/', label: 'Home', icon: <HomeOutlined />, active: <HomeFilled /> },
  { key: '/create', label: 'Create', icon: <PlusCircleOutlined />, active: <PlusCircleFilled /> },
  { key: '/submissions', label: 'Submissions', icon: <ProfileOutlined />, active: <ProfileFilled /> },
  { key: '/billing', label: 'Billing', icon: <WalletOutlined />, active: <WalletFilled /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined />, active: <SettingFilled /> },
  { key: '/support', label: 'Support', icon: <QuestionCircleOutlined />, active: <QuestionCircleFilled /> },
];

/** iOS-style fixed bottom tab bar for primary navigation on mobile. */
export default function BottomTabBar() {
  const { pathname } = useLocation();
  const { isDark } = useTheme();
  const surface = isDark ? SURFACE.dark : SURFACE.light;
  const isActive = (key: string) => (key === '/' ? pathname === '/' : pathname.startsWith(key));

  return (
    <nav
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: surface.header,
        borderTop: `1px solid ${surface.border}`,
        boxShadow: isDark ? '0 -1px 10px rgba(0,0,0,0.4)' : '0 -1px 8px rgba(16,24,40,0.05)',
        // Always keep a little breathing room so the home indicator never overlaps the icons,
        // even on browsers where env(safe-area-inset-bottom) resolves to 0.
        paddingBottom: 'max(env(safe-area-inset-bottom), 8px)',
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
              padding: '9px 2px 7px',
              color: on ? '#3b5bdb' : surface.tabInactive,
              fontSize: 19,
              lineHeight: 1,
            }}
          >
            {on ? t.active : t.icon}
            <span style={{ fontSize: 9.5, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap' }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
