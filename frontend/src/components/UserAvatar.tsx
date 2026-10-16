import { useMe } from '../hooks/useMe';
import { useTheme } from '../theme/ThemeContext';

/** The signed-in user's profile photo, or their initials on a brand gradient. */
export default function UserAvatar({ size = 32, src }: { size?: number; src?: string | null }) {
  const { me } = useMe();
  const { palette: p } = useTheme();
  const image = src !== undefined ? src : me?.avatar;
  const name = me?.companyName || me?.email || '';
  const initials =
    name
      .replace(/@.*/, '')
      .split(/[\s._-]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0]!.toUpperCase())
      .join('') || '?';
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        flex: 'none',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        fontSize: Math.round(size * 0.4),
        fontWeight: 700,
        color: p.onPrimary,
        background: image ? p.subtle : 'var(--grad-primary)',
        boxShadow: `0 0 0 2px ${p.card}, 0 0 0 3px ${p.border}`,
      }}
    >
      {image ? (
        <img src={image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
      ) : (
        initials
      )}
    </span>
  );
}
