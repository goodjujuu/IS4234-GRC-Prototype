import { Callout, Card, CardHeader, PeerRange, RiskBadge, TableWrap, TrendLine, tdClass, thClass } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { METRICS, explainMetric, formatMetric } from '@/lib/scoring';

export function IndicatorNotice() {
  return (
    <Callout tone="blue" icon="eye">
      A score is an indicator, not proof. Every flag has a human reviewer and a route to dispute it.
    </Callout>
  );
}

// Score, peer comparison and plain-language explanations for one employee.
export function ScoreSummary({ record, viewer = 'admin' }) {
  const { latest, history } = record;
  if (!latest) return <Card>No score has been calculated yet.</Card>;
  const counts = latest.metrics.counts;
  const metrics = METRICS.map((m) => ({ metric: m, data: latest.metrics[m.key] })).sort((a, b) => b.data.contribution - a.data.contribution);
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        <Card>
          <p className="text-[13px] font-medium text-slate-500">Current risk score</p>
          <div className="mt-2 flex items-center gap-3">
            <span className="text-[34px] font-semibold tabular-nums tracking-tight text-slate-900">{latest.score}</span>
            <RiskBadge level={latest.level} />
          </div>
          <p className="mt-1 text-xs text-slate-500">Scale of 0 to 100, calculated {formatDate(latest.asOf)}</p>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            Includes {latest.metrics.harm} points for the {counts.customersAffected} customers affected, so the score reflects harm as well as likelihood.
          </p>
        </Card>
        <Card className="lg:col-span-2">
          <p className="text-[13px] font-medium text-slate-500">Risk score trend, last {history.length} runs</p>
          <div className="mt-2">
            <TrendLine points={history.map((h) => ({ value: h.score, label: formatDate(h.asOf) }))} max={100} label="Risk score over recent scoring runs" />
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          icon="sliders"
          title={viewer === 'self' ? 'Your metrics against your peers' : 'Metrics against peers'}
          subtitle="The dot is this employee, the band is the middle half of people in the same role, the tick is their median. In each trend, the solid line is this employee and the dashed line is the peer median."
        />
        <div className="space-y-4">
          {metrics.map(({ metric, data }) => {
            const value = formatMetric(metric.unit, data.value);
            const med = formatMetric(metric.unit, data.median);
            return (
              <div key={metric.key} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
                <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
                  <p className="text-sm font-semibold text-slate-800">{metric.label}</p>
                  <p className="text-[13px] tabular-nums text-slate-600">
                    <span className="font-semibold text-slate-900">{value}</span> against peers {med}
                    <span className="ml-2 text-xs text-slate-500">adds {data.contribution} points</span>
                  </p>
                </div>
                <div className="mt-1.5">
                  <PeerRange value={data.value} p25={data.p25} p75={data.p75} median={data.median} max={data.p75 * 2.4} formatted={value} medianText={med} />
                </div>
                <p className="mt-1 text-[13px] leading-relaxed text-slate-600">{explainMetric(metric, data, counts)}</p>
                <p className="mt-0.5 text-xs text-slate-400">Why it matters: {metric.justification}</p>
                {history.length > 1 && (
                  <div className="mt-2 max-w-md">
                    <TrendLine
                      points={history.map((h) => ({ value: h.metrics[metric.key].value, label: formatDate(h.asOf) }))}
                      compare={history.map((h) => ({ value: h.metrics[metric.key].median }))}
                      format={(v) => formatMetric(metric.unit, v)}
                      label={`${metric.label} over time compared with peers`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

export function FlaggedAccounts({ accounts }) {
  return (
    <Card>
      <CardHeader icon="filter" title="Accounts behind the flags" subtitle="Customers appear only as pseudonymous references." />
      {accounts.length === 0 ? (
        <p className="text-sm text-slate-500">No accounts are flagged in the current windows.</p>
      ) : (
        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Account</th>
                <th className={thClass}>Customer</th>
                <th className={thClass}>Product</th>
                <th className={thClass}>Opened</th>
                <th className={thClass}>Why flagged</th>
              </tr>
            </thead>
            <tbody>
              {accounts.slice(0, 15).map((a) => (
                <tr key={a.ref}>
                  <td className={`${tdClass} whitespace-nowrap font-medium tabular-nums`}>{a.ref}</td>
                  <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{a.customerRef}</td>
                  <td className={tdClass}>{a.product}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(a.openedAt)}</td>
                  <td className={tdClass}>{a.reasons.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {accounts.length > 15 && <p className="mt-2 text-xs text-slate-500">Showing the 15 with the most reasons, of {accounts.length} flagged.</p>}
        </TableWrap>
      )}
    </Card>
  );
}
