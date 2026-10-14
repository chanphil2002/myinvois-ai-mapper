import { FileDoneOutlined } from '@ant-design/icons';

/** The MyTax brand mark + wordmark. `dark` for use on the dark sidebar. */
export default function BrandLogo({ dark = false, size = 'md' }: { dark?: boolean; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 46 : 34;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div
        style={{
          width: box,
          height: box,
          borderRadius: 11,
          background: 'linear-gradient(135deg, #10b981 0%, #065f46 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          fontSize: size === 'lg' ? 22 : 17,
          flex: 'none',
          boxShadow: '0 4px 12px rgba(4,120,87,0.30)',
        }}
      >
        <FileDoneOutlined />
      </div>
      <div style={{ lineHeight: 1.15 }}>
        <div
          style={{
            fontWeight: 700,
            fontSize: size === 'lg' ? 20 : 16,
            color: dark ? '#ececea' : '#1c1c1a',
            letterSpacing: 0.2,
          }}
        >
          MyTax
        </div>
        <div style={{ fontSize: 11, color: dark ? '#a8a8a3' : '#57534e' }}>e-Invoicing</div>
      </div>
    </div>
  );
}
