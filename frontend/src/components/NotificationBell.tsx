import { useState } from 'react';
import { Badge, Button, Drawer, Empty, Popover, Tooltip, Typography } from 'antd';
import {
  BellOutlined,
  CheckCircleFilled,
  ClockCircleFilled,
  CloseCircleFilled,
  CreditCardFilled,
} from '@ant-design/icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { listNotifications, markAllNotificationsRead, markNotificationRead } from '../api/endpoints';
import type { NotificationItem, NotificationType } from '../api/types';
import { useIsMobile } from '../hooks/useIsMobile';
import { useTheme } from '../theme/ThemeContext';

dayjs.extend(relativeTime);

/** In-app notification centre: bell + unread badge; a popover on desktop, a bottom sheet on phones. */
export default function NotificationBell() {
  const mobile = useIsMobile();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { palette: p } = useTheme();
  const [open, setOpen] = useState(false);

  // Poll for new alerts (LHDN verdicts arrive from a background job); faster while the panel is open.
  const { data } = useQuery({
    queryKey: ['notifications'],
    queryFn: listNotifications,
    refetchInterval: open ? 15_000 : 60_000,
  });
  const unread = data?.unreadCount ?? 0;
  const items = data?.items ?? [];

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['notifications'] });
  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: refresh });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: refresh });

  const icon: Record<NotificationType, JSX.Element> = {
    SUBMISSION_ACCEPTED: <CheckCircleFilled style={{ color: p.success }} />,
    SUBMISSION_REJECTED: <CloseCircleFilled style={{ color: p.error }} />,
    SUBSCRIPTION_EXPIRING: <CreditCardFilled style={{ color: p.warning }} />,
    CONSOLIDATED_DUE: <ClockCircleFilled style={{ color: p.warning }} />,
  };

  const openItem = (n: NotificationItem) => {
    if (!n.read) readOne.mutate(n.id);
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const list = (
    <div style={{ width: mobile ? '100%' : 360 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: 8 }}>
        <Typography.Text strong style={{ fontSize: 16 }}>
          Notifications
        </Typography.Text>
        {unread > 0 && (
          <Button type="link" size="small" style={{ paddingInline: 0 }} onClick={() => readAll.mutate()}>
            Mark all as read
          </Button>
        )}
      </div>
      {items.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="You're all caught up" style={{ margin: '24px 0' }} />
      ) : (
        <div style={{ maxHeight: mobile ? '60vh' : 420, overflowY: 'auto', marginInline: -4 }}>
          {items.map((n) => (
            <div
              key={n.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(n)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && openItem(n)}
              style={{
                display: 'flex',
                gap: 12,
                padding: '12px 8px',
                minHeight: 44,
                borderRadius: 10,
                cursor: 'pointer',
                background: n.read ? 'transparent' : p.primarySoft,
                marginBottom: 2,
              }}
            >
              <span style={{ fontSize: 18, lineHeight: '22px' }}>{icon[n.type]}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: n.read ? 500 : 650, lineHeight: 1.35, overflowWrap: 'anywhere' }}>{n.title}</div>
                {n.body && (
                  <div
                    style={{
                      fontSize: 13,
                      color: p.textSecondary,
                      marginTop: 2,
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {n.body}
                  </div>
                )}
                <div style={{ fontSize: 12, color: p.textTertiary, marginTop: 4 }}>{dayjs(n.createdAt).fromNow()}</div>
              </div>
              {!n.read && (
                <span
                  aria-label="Unread"
                  style={{ width: 8, height: 8, borderRadius: '50%', background: p.primary, marginTop: 7, flex: 'none' }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const trigger = (
    <Tooltip title={mobile ? undefined : 'Notifications'}>
      <Badge count={unread} size="small" offset={[-4, 4]}>
        <Button
          type="text"
          shape="circle"
          aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
          icon={<BellOutlined style={{ fontSize: 18 }} />}
          onClick={() => setOpen(!open)}
        />
      </Badge>
    </Tooltip>
  );

  if (mobile) {
    return (
      <>
        {trigger}
        <Drawer
          placement="bottom"
          open={open}
          onClose={() => setOpen(false)}
          height="auto"
          closable={false}
          styles={{ body: { padding: '16px 16px calc(16px + env(safe-area-inset-bottom))' } }}
          style={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
        >
          {list}
        </Drawer>
      </>
    );
  }

  return (
    <Popover content={list} trigger="click" open={open} onOpenChange={setOpen} placement="bottomRight" arrow={false}>
      <span>
        <Badge count={unread} size="small" offset={[-4, 4]}>
          <Button
            type="text"
            shape="circle"
            aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
            icon={<BellOutlined style={{ fontSize: 18 }} />}
          />
        </Badge>
      </span>
    </Popover>
  );
}
