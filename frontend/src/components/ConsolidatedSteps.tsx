import { Steps } from 'antd';

/** 0 = set up, 1 = add sales, 2 = review & confirm, 3 = submit/done. */
export default function ConsolidatedSteps({ current }: { current: number }) {
  return (
    <Steps
      size="small"
      current={current}
      responsive={false}
      items={[{ title: 'Period' }, { title: 'Add sales' }, { title: 'Review' }, { title: 'Submit' }]}
    />
  );
}
