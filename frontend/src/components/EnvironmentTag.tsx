import { Tag } from 'antd';
import type { MyInvoisEnvironment } from '../api/types';
import { useTheme } from '../theme/ThemeContext';

/** Which LHDN environment a submission went to — production is highlighted so it's never mistaken for a test. */
export default function EnvironmentTag({ environment }: { environment?: MyInvoisEnvironment | null }) {
  const { palette: p } = useTheme();
  const prod = environment === 'PRODUCTION';
  return (
    <Tag
      style={{
        marginInlineEnd: 0,
        color: prod ? p.warning : p.textSecondary,
        background: prod ? p.warningSoft : p.subtle,
        borderColor: prod ? `${p.warning}55` : p.border,
      }}
    >
      {prod ? 'Production' : 'Sandbox'}
    </Tag>
  );
}
