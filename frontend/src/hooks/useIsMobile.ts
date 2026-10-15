import { useEffect, useState } from 'react';

/** Below antd's `lg` breakpoint the app switches to its phone layout (bottom tabs, cards). */
export const MOBILE_QUERY = '(max-width: 991.98px)';

const query = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;

/**
 * Single source of truth for "phone layout", usable outside antd's ConfigProvider (e.g. by the
 * theme itself). Prefer this over ad-hoc Grid.useBreakpoint() checks so every component flips at
 * the same width.
 */
export function useIsMobile(): boolean {
  const [mobile, setMobile] = useState(query);
  useEffect(() => {
    const mql = window.matchMedia(MOBILE_QUERY);
    const onChange = () => setMobile(mql.matches);
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, []);
  return mobile;
}
