import { Card, Skeleton, Tooltip, theme } from 'antd';
import { EditOutlined, RobotOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { getDocumentStats } from '../api/endpoints';
import { useTheme } from '../theme/ThemeContext';

const TYPE_LABEL: Record<string, string> = { pdf: 'PDF', png: 'PNG', jpeg: 'JPEG', csv: 'CSV', xlsx: 'Excel', other: 'Other' };

/** How the user's data got in: documents the AI read (by file type) vs. entries typed in by hand. */
export default function DocumentStatsCard() {
  const { token } = theme.useToken();
  const { palette: p } = useTheme();
  const { data, isLoading } = useQuery({ queryKey: ['document-stats'], queryFn: getDocumentStats });

  const types = (data?.byType ?? []).filter((t) => t.type !== 'other' || t.parsed + t.failed > 0);
  const max = Math.max(1, ...types.map((t) => t.parsed + t.failed));
  const attempted = (data?.aiParsed ?? 0) + (data?.aiFailed ?? 0);
  const successRate = attempted ? Math.round(((data?.aiParsed ?? 0) / attempted) * 100) : null;

  const section = (title: string) => (
    <div style={{ fontSize: 12, fontWeight: 600, color: token.colorTextSecondary, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8 }}>
      {title}
    </div>
  );
  const pair = (icon: JSX.Element, label: string, a: number, aLabel: string, b: number, bLabel: string) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: p.subtle }}>
      <span style={{ fontSize: 16, color: p.link }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: token.colorTextSecondary }}>{label}</div>
        <div style={{ fontWeight: 600 }}>
          {a} {aLabel} · {b} {bLabel}
        </div>
      </div>
    </div>
  );

  return (
    <Card title="Documents & entries" className="dash-stats">
      {isLoading || !data ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 32, fontWeight: 700, lineHeight: 1 }} className="gradient-text">
                {data.aiParsed}
              </span>
              <span style={{ color: token.colorTextSecondary }}>documents read by AI</span>
            </div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
              {successRate === null
                ? 'Upload a receipt, PDF or spreadsheet to get started.'
                : `${successRate}% success${data.aiFailed ? ` · ${data.aiFailed} failed` : ''}`}
            </div>
          </div>

          <div>
            {section('By file type')}
            <div style={{ display: 'grid', gap: 10 }}>
              {types.map((t) => (
                <Tooltip key={t.type} title={`${t.parsed} parsed${t.failed ? `, ${t.failed} failed` : ''}`}>
                  <div style={{ display: 'grid', gridTemplateColumns: '52px 1fr 28px', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{TYPE_LABEL[t.type]}</span>
                    <div style={{ height: 8, borderRadius: 4, background: p.subtle, overflow: 'hidden', display: 'flex' }}>
                      <div className="gradient-bar" style={{ width: `${(t.parsed / max) * 100}%` }} />
                      {t.failed > 0 && <div style={{ width: `${(t.failed / max) * 100}%`, background: p.error, opacity: 0.6 }} />}
                    </div>
                    <span style={{ fontSize: 13, textAlign: 'right', color: t.parsed ? token.colorText : token.colorTextTertiary }}>
                      {t.parsed}
                    </span>
                  </div>
                </Tooltip>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gap: 8 }}>
            {section('What went in')}
            {pair(<RobotOutlined />, 'Read by AI', data.aiInvoices, data.aiInvoices === 1 ? 'invoice' : 'invoices', data.aiSales, data.aiSales === 1 ? 'sale' : 'sales')}
            {pair(<EditOutlined />, 'Keyed in by you', data.manualInvoices, data.manualInvoices === 1 ? 'invoice' : 'invoices', data.manualSales, data.manualSales === 1 ? 'sale' : 'sales')}
          </div>
        </div>
      )}
    </Card>
  );
}
