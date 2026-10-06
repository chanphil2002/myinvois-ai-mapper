import { useEffect, useMemo, useState } from 'react';
import { Button, Card, DatePicker, Space, Statistic, Typography, message } from 'antd';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import TransactionSelectionTable from '../components/TransactionSelectionTable';
import { createConsolidatedInvoice, listEligibleTransactions } from '../api/endpoints';

const { RangePicker } = DatePicker;

export default function ConsolidationBuilder() {
  const navigate = useNavigate();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [period, setPeriod] = useState<[Dayjs, Dayjs]>([dayjs().startOf('month'), dayjs().endOf('month')]);

  const { data: transactions, isLoading } = useQuery({
    queryKey: ['eligible-transactions'],
    queryFn: listEligibleTransactions,
  });

  // Pre-select whatever the AI flagged as eligible; the user can still check/uncheck any row.
  useEffect(() => {
    if (transactions) {
      setSelectedIds(transactions.filter((t) => t.eligibleForConsolidation).map((t) => t.id));
    }
  }, [transactions]);

  const selectedTransactions = useMemo(
    () => (transactions ?? []).filter((t) => selectedIds.includes(t.id)),
    [transactions, selectedIds],
  );

  const preview = useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    for (const t of selectedTransactions) {
      subtotal += t.quantity * t.unitPrice;
      taxTotal += t.taxAmount;
    }
    return { subtotal: Math.round(subtotal * 100) / 100, taxTotal: Math.round(taxTotal * 100) / 100 };
  }, [selectedTransactions]);

  const generateMutation = useMutation({
    mutationFn: createConsolidatedInvoice,
    onSuccess: (invoice) => {
      message.success('Consolidated invoice created');
      navigate(`/consolidated-invoices/${invoice.id}`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : 'Failed to create consolidated invoice'),
  });

  const onGenerate = () => {
    if (selectedIds.length === 0) {
      message.error('Select at least one transaction');
      return;
    }
    generateMutation.mutate({
      transactionIds: selectedIds,
      periodStart: period[0].format('YYYY-MM-DD'),
      periodEnd: period[1].format('YYYY-MM-DD'),
    });
  };

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      <Card>
        <Typography.Title level={4}>Build a consolidated e-Invoice</Typography.Title>
        <Typography.Paragraph type="secondary">
          Every ungrouped transaction from your uploads is listed below. Rows the AI flagged as likely B2C
          (no buyer identified) are pre-selected — review and adjust the selection before generating.
        </Typography.Paragraph>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>Period</Typography.Text>
            <br />
            <RangePicker
              value={period}
              onChange={(dates) => dates && setPeriod([dates[0]!, dates[1]!])}
              style={{ marginTop: 8 }}
            />
          </div>
          <Space size="large">
            <Statistic title="Selected transactions" value={selectedIds.length} />
            <Statistic title="Subtotal" value={preview.subtotal} precision={2} prefix="MYR" />
            <Statistic title="Tax total" value={preview.taxTotal} precision={2} prefix="MYR" />
            <Statistic title="Grand total" value={preview.subtotal + preview.taxTotal} precision={2} prefix="MYR" />
          </Space>
          <Button type="primary" onClick={onGenerate} loading={generateMutation.isPending}>
            Generate consolidated invoice
          </Button>
        </Space>
      </Card>

      <Card title="Ungrouped transactions">
        <TransactionSelectionTable
          transactions={transactions ?? []}
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          loading={isLoading}
        />
      </Card>
    </Space>
  );
}
