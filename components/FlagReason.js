import { HARM, caseIndicators, metricStatus } from '@/components/MyConduct';
import { Badge, cx } from '@/components/ui';
import { formatMetric } from '@/lib/scoring';

// The indicators behind one flag, read from the score snapshot stored on the case.
export function FlagReason({ flag }) {
  const ev = flag.evidence;
  if (!ev?.metrics) return null;
  return (
    <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {caseIndicators(ev).map(({ metric, data, category }) => {
        const status = metricStatus(data.z);
        return (
          <div key={metric.key} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
            <span className={cx('h-2.5 w-2.5 shrink-0 rounded-sm', category?.color)} title={category?.label} />
            <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{metric.label}</span>
            <span className="text-[13px] tabular-nums text-slate-500">You {formatMetric(metric.unit, data.value)}, peers {formatMetric(metric.unit, data.median)}</span>
            <Badge tone={status.tone}>{status.label}</Badge>
            <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-slate-900">+{Math.round(data.contribution)}</span>
          </div>
        );
      })}
      {ev.metrics.harm > 0 && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3.5 py-2.5">
          <span className={cx('h-2.5 w-2.5 shrink-0 rounded-sm', HARM.color)} />
          <span className="min-w-0 flex-1 text-[13px] font-medium text-slate-800">{HARM.label}</span>
          <span className="text-[13px] tabular-nums text-slate-500">{ev.metrics.counts.customersAffected} customers with a warning sign</span>
          <span className="w-10 text-right text-[13px] font-semibold tabular-nums text-slate-900">+{Math.round(ev.metrics.harm)}</span>
        </div>
      )}
    </div>
  );
}
