/** The MyTax brand mark + wordmark. `dark` for use on the dark sidebar. */
export default function BrandLogo({ dark = false, size = 'md' }: { dark?: boolean; size?: 'md' | 'lg' }) {
  const box = size === 'lg' ? 46 : 34;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      {/* The mark sits on a white tile so its navy strokes stay visible on the dark sidebar. */}
      <div
        style={{
          width: box,
          height: box,
          borderRadius: 10,
          background: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 'none',
          padding: size === 'lg' ? 5 : 4,
          boxSizing: 'border-box',
          boxShadow: dark ? 'none' : '0 1px 3px rgba(28,28,26,0.12)',
          border: dark ? 'none' : '1px solid #e5e5e1',
        }}
      >
        <img src="/logo-mark.png" alt="MyTax" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
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
