import type { ReactNode } from 'react';
import { Card, theme } from 'antd';
import { ArrowRightOutlined } from '@ant-design/icons';

interface Props {
  title: string;
  description: string;
  onClick: () => void;
  icon?: ReactNode;
  color?: string;
  soft?: string;
}

/** A clickable choice card (invoice type, entry method) — one consistent heading style everywhere. */
export default function OptionCard({ title, description, onClick, icon, color, soft }: Props) {
  const { token } = theme.useToken();
  return (
    <Card hoverable onClick={onClick} style={{ height: '100%' }}>
      {icon && (
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
            color,
            background: soft,
            marginBottom: 14,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: 16, fontWeight: 600, lineHeight: 1.4, color: token.colorText, marginBottom: 6 }}>{title}</div>
      <div style={{ color: token.colorTextSecondary, lineHeight: 1.6, marginBottom: 12 }}>{description}</div>
      <span style={{ color: token.colorLink, fontWeight: 500 }}>
        Continue <ArrowRightOutlined style={{ fontSize: 12 }} />
      </span>
    </Card>
  );
}
