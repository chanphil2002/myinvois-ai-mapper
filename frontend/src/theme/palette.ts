/**
 * "Graphite + Emerald" — the single source of truth for every colour in the app.
 * Warm graphite neutrals with an emerald accent. Every text/surface pair below was checked
 * against WCAG AA (≥4.5:1 for body text) on the card surface it sits on.
 *
 * Dark mode is a dedicated palette, not an inversion: surfaces get *lighter* as they rise
 * (bg → card → elevated), text is off-white rather than pure white, and accents use lighter,
 * less saturated tints so they don't glare or fail contrast on dark surfaces.
 */
export interface Palette {
  bg: string; // page canvas
  card: string; // cards, tables, inputs
  elevated: string; // modals, dropdowns, popovers
  subtle: string; // table headers, hover rows, inset areas
  border: string;
  borderStrong: string;

  text: string;
  textSecondary: string;
  textTertiary: string;
  textDisabled: string; // read-only/disabled field values — still informative, so kept legible

  primary: string; // filled controls (primary buttons, switches, active tabs)
  onPrimary: string; // text on a primary fill
  link: string; // accent used as *text* (links, active tab labels)
  primarySoft: string; // tinted background for accent chips/icons

  success: string;
  warning: string;
  error: string;
  info: string;
  successSoft: string;
  warningSoft: string;
  errorSoft: string;
  infoSoft: string;

  // App chrome
  header: string;
  sider: string;
  siderActive: string; // selected nav item fill (white text on it)
  siderHover: string;
  tabInactive: string;
  shadow: string;
}

export const PALETTES: Record<'light' | 'dark', Palette> = {
  light: {
    bg: '#f7f7f5',
    card: '#ffffff',
    elevated: '#ffffff',
    subtle: '#f3f3f0',
    border: '#e5e5e1',
    borderStrong: '#d6d3d1',

    text: '#1c1c1a', // 17.1:1 on card
    textSecondary: '#57534e', // 7.6:1
    textTertiary: '#78716c', // 4.8:1
    textDisabled: '#8a847e',

    primary: '#047857', // emerald-700, white text 5.5:1
    onPrimary: '#ffffff',
    link: '#047857',
    primarySoft: '#ecfdf5',

    success: '#15803d',
    warning: '#b45309',
    error: '#b91c1c',
    info: '#1d4ed8',
    successSoft: '#f0fdf4',
    warningSoft: '#fffbeb',
    errorSoft: '#fef2f2',
    infoSoft: '#eff6ff',

    header: '#ffffff',
    sider: '#1c1c1a',
    siderActive: '#047857',
    siderHover: 'rgba(255,255,255,0.07)',
    tabInactive: '#78716c',
    shadow: '0 1px 2px rgba(28,28,26,0.05), 0 1px 3px rgba(28,28,26,0.04)',
  },
  dark: {
    bg: '#121211',
    card: '#1b1b19',
    elevated: '#242422',
    subtle: '#222220',
    border: '#2e2e2b',
    borderStrong: '#3d3d39',

    text: '#ececea', // 14.6:1 on card
    textSecondary: '#a8a8a3', // 7.2:1
    textTertiary: '#8f8f89', // 5.3:1
    textDisabled: '#86867f',

    primary: '#10b981', // emerald-500 fill, dark text on it 5.8:1
    onPrimary: '#062e22',
    link: '#34d399', // 9.0:1 on card
    primarySoft: 'rgba(16,185,129,0.14)',

    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    info: '#60a5fa',
    successSoft: 'rgba(74,222,128,0.12)',
    warningSoft: 'rgba(251,191,36,0.12)',
    errorSoft: 'rgba(248,113,113,0.14)',
    infoSoft: 'rgba(96,165,250,0.12)',

    header: '#1b1b19',
    sider: '#0e0e0d',
    siderActive: '#047857',
    siderHover: 'rgba(255,255,255,0.06)',
    tabInactive: '#8f8f89',
    shadow: 'none', // shadows don't read on dark — elevation comes from lighter surfaces
  },
};

/** Background tint for an AI confidence score (high / medium / low). */
export function confidenceTint(score: number | null, p: Palette): string | undefined {
  if (score === null) return undefined;
  if (score >= 0.8) return p.successSoft;
  if (score >= 0.5) return p.warningSoft;
  return p.errorSoft;
}
