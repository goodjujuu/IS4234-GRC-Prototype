import { Callout, Card, CardHeader, PageHeader, StatCard, TableWrap, TrendLine, tdClass, thClass } from '@/components/ui';
import { formatDate, formatHours, percent } from '@/lib/format';
import { getEffectiveness } from '@/lib/kri';
import { requireUser } from '@/lib/session';

const LEVEL_NAME = { MEDIUM: 'Medium', HIGH: 'High' };

export default async function EffectivenessPage() {
  await requireUser(['INTERNAL_AUDIT']);
  const e = await getEffectiveness();
  return (
    <div className="space-y-6">
      <PageHeader level="monitoring" eyebrow="Risk Reporting" title="Effectiveness" description="How well monitoring is working, measured against its targets." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Flags reviewed within deadline" value={percent(e.pctOnTime)} hint={`${e.onTime} of ${e.dueCount} flags due. Target at least 95%.`} tone={e.pctOnTime >= 0.95 ? 'green' : 'amber'} />
        <StatCard label="Average time to resolve a case" value={formatHours(e.avgHours)} hint={e.byLevel.map((l) => `${LEVEL_NAME[l.level]} ${formatHours(l.avgHours)}, deadline ${formatHours(l.deadlineHours)}`).join('. ')} />
        <StatCard label="False alarm rate" value={percent(e.falseAlarmRate)} hint={`${e.upheldCount} flags overturned of ${e.closedCount} closed. Target falling over time.`} />
        <StatCard label="Unapproved threshold changes" value={e.unapproved.length} hint="Target zero." tone={e.unapproved.length ? 'red' : 'green'} />
      </div>
      {e.unapproved.length > 0 && (
        <Callout tone="red" icon="alert" title="Settings changed without approval">
          {e.unapproved.map((u) => `${u.label} is ${u.actual}, but the approved value is ${u.expected}.`).join(' ')}
        </Callout>
      )}
      <Card>
        <CardHeader icon="chart" title="Bank-wide unused account rate" subtitle="Accounts with no genuine activity within 90 days, at each scoring run." />
        <TrendLine points={e.trend.map((t) => ({ value: t.rate, label: formatDate(t.asOf) }))} format={percent} max={Math.max(0.3, ...e.trend.map((t) => t.rate))} label="Bank-wide unused account rate by scoring run" />
      </Card>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader icon="building" title="False alarms by branch" />
          <TableWrap>
            <table className="w-full min-w-[360px] border-collapse">
              <thead><tr><th className={thClass}>Branch</th><th className={thClass}>Closed flags</th><th className={thClass}>Overturned</th><th className={thClass}>Rate</th></tr></thead>
              <tbody>
                {e.falseAlarmsByBranch.map((b) => (
                  <tr key={b.code}><td className={tdClass}>{b.code} {b.name}</td><td className={`${tdClass} tabular-nums`}>{b.closed}</td><td className={`${tdClass} tabular-nums`}>{b.upheld}</td><td className={`${tdClass} tabular-nums`}>{percent(b.rate)}</td></tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
        <Card>
          <CardHeader icon="filter" title="False alarms by metric" subtitle="Upheld disputes by metric, which can inform a proposal to adjust the weights." />
          <TableWrap>
            <table className="w-full min-w-[360px] border-collapse">
              <thead><tr><th className={thClass}>Metric</th><th className={thClass}>Disputes</th><th className={thClass}>Upheld</th></tr></thead>
              <tbody>
                {e.falseAlarmsByMetric.map((m) => (
                  <tr key={m.key}><td className={tdClass}>{m.label}</td><td className={`${tdClass} tabular-nums`}>{m.disputes}</td><td className={`${tdClass} tabular-nums`}>{m.upheld}</td></tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}
