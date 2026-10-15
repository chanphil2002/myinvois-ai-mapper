import { Link, useLocation } from 'react-router-dom';
import {
  HomeOutlined,
  HomeFilled,
  PlusOutlined,
  ProfileOutlined,
  ProfileFilled,
  WalletOutlined,
  WalletFilled,
  SettingOutlined,
  SettingFilled,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import { useTheme } from '../theme/ThemeContext';

/** Height of the bar above the safe area — pages and floating UI offset by this. */
export const TAB_BAR_HEIGHT = 60;

// Five destinations max (Apple HIG / Material guidance); the primary action sits in the middle.
// Help & support and Log out live under Settings → Account.
const TABS: { key: string; label: string; icon: ReactNode; active: ReactNode; primary?: boolean }[] = [
  { key: '/', label: 'Home', icon: <HomeOutlined />, active: <HomeFilled /> },
  { key: '/submissions', label: 'Invoices', icon: <ProfileOutlined />, active: <ProfileFilled /> },
  { key: '/create', label: 'Create', icon: <PlusOutlined />, active: <PlusOutlined />, primary: true },
  { key: '/billing', label: 'Billing', icon: <WalletOutlined />, active: <WalletFilled /> },
  { key: '/settings', label: 'Settings', icon: <SettingOutlined />, active: <SettingFilled /> },
];

/** Native-style fixed bottom tab bar for primary navigation on phones. */
export default function BottomTabBar() {
  const { pathname } = useLocation();
  const { isDark, palette: p } = useTheme();
  const isActive = (key: string) =>
    key === '/' ? pathname === '/' : pathname.startsWith(key) || (key === '/settings' && pathname === '/support');

  return (
    <nav
      aria-label="Main"
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
        background: p.header,
        borderTop: `1px solid ${p.border}`,
        boxShadow: isDark ? 'none' : '0 -1px 8px rgba(28,28,26,0.05)',
        // Keep clear of the iOS home indicator, with a minimum gap where the inset resolves to 0.
        paddingBottom: 'max(env(safe-area-inset-bottom), 6px)',
        display: 'flex',
      }}
    >
      {TABS.map((t) => {
        const on = isActive(t.key);
        return (
          <Link
            key={t.key}
            to={t.key}
            aria-current={on ? 'page' : undefined}
            style={{
              flex: 1,
              minHeight: TAB_BAR_HEIGHT,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 4,
              color: on ? p.link : p.tabInactive,
              lineHeight: 1,
            }}
          >
            {t.primary ? (
              <span
                style={{
                  width: 40,
                  height: 32,
                  borderRadius: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  color: p.onPrimary,
                  background: p.primary,
                  boxShadow: on ? `0 0 0 3px ${p.primarySoft}` : 'none',
                }}
              >
                {t.icon}
              </span>
            ) : (
              <span style={{ fontSize: 21, height: 32, display: 'flex', alignItems: 'center' }}>{on ? t.active : t.icon}</span>
            )}
            <span style={{ fontSize: 11, fontWeight: on ? 600 : 500, whiteSpace: 'nowrap' }}>{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
