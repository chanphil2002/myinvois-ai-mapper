import { useState } from 'react';
import { Alert, Button, Card, DatePicker, Input, Space, Typography, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import ConsolidatedSteps from '../../components/ConsolidatedSteps';
import { createConsolidatedDraft } from '../../api/endpoints';

/**
 * Step 1 of a consolidated e-invoice: name + period. This creates a real DRAFT straight away
 * (so it shows in Submissions), then sales are added inside it — typed in, uploaded, or both.
 */
export default function CreateConsolidated() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [period, setPeriod] = useState<[Dayjs, Dayjs] | null>([dayjs().startOf('month'), dayjs().endOf('month')]);

  const createDraft = useMutation({
    mutationFn: async (_add: 'manual' | 'upload') => {
      if (!period) throw new Error('Select the period these sales cover');
      return createConsolidatedDraft({
        invoiceName: name.trim() || null,
        periodStart: period[0].format('YYYY-MM-DD'),
        periodEnd: period[1].format('YYYY-MM-DD'),
      });
    },
    onSuccess: (invoice, add) => {
      queryClient.invalidateQueries({ queryKey: ['consolidated-invoices'] });
      navigate(`/consolidated-invoices/${invoice.id}?add=${add}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Could not create the draft'),
  });

  return (
    <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 820 }}>
      <Button type="link" style={{ paddingLeft: 0, alignSelf: 'flex-start' }} onClick={() => navigate('/create')}>
        ← Back
      </Button>
      <div>
        <Typography.Title level={3} style={{ marginTop: 0 }}>
          Consolidated e-Invoice
        </Typography.Title>
        <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
          Combine many small B2C sales (customers with no named buyer) into one invoice for a period — typically one per
          month. Check LHDN’s current guidance for the submission deadline.
        </Typography.Paragraph>
      </div>

      <ConsolidatedSteps current={0} />

      <Card title="Name and period">
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div style={{ maxWidth: 360 }}>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Invoice name (optional)
            </Typography.Text>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. September B2C consolidated"
              style={{ marginTop: 4 }}
            />
          </div>
          <div>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Period these sales cover
            </Typography.Text>
            <br />
            <DatePicker.RangePicker
              value={period}
              onChange={(v) => setPeriod(v as [Dayjs, Dayjs] | null)}
              style={{ marginTop: 4 }}
            />
          </div>
          <Alert
            type="info"
            showIcon
            message="Next: add your sales"
            description="We’ll save this as a draft. You can then key in sales, upload receipts or spreadsheets (AI extracts them), or do both — and add more later."
          />
          <Space wrap>
            <Button type="primary" loading={createDraft.isPending} onClick={() => createDraft.mutate('manual')}>
              Create draft &amp; key in sales
            </Button>
            <Button loading={createDraft.isPending} onClick={() => createDraft.mutate('upload')}>
              Create draft &amp; upload files
            </Button>
          </Space>
        </Space>
      </Card>
    </Space>
  );
}
