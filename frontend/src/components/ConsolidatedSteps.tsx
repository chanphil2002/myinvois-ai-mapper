import { Steps, theme } from 'antd';
import { useIsMobile } from '../hooks/useIsMobile';

const STEPS = ['Period', 'Add sales', 'Review', 'Submit'];

/** 0 = set up, 1 = add sales, 2 = review & confirm, 3 = submit/done. */
export default function ConsolidatedSteps({ current }: { current: number }) {
  const { token } = theme.useToken();
  const mobile = useIsMobile();

  if (mobile) {
    // Four labelled steps don't fit a phone width; use a segmented progress bar + "Step n of 4".
    return (
      <div aria-label={`Step ${current + 1} of ${STEPS.length}: ${STEPS[current]}`}>
        <div style={{ display: 'flex', gap: 4 }}>
          {STEPS.map((s, i) => (
            <div
              key={s}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: i <= current ? token.colorPrimary : token.colorBorderSecondary,
              }}
            />
          ))}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, color: token.colorTextSecondary }}>
          Step {current + 1} of {STEPS.length} · <span style={{ color: token.colorText, fontWeight: 600 }}>{STEPS[current]}</span>
        </div>
      </div>
    );
  }

  return <Steps size="small" current={current} responsive={false} items={STEPS.map((title) => ({ title }))} />;
}
