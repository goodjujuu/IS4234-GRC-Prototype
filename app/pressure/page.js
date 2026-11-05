import Link from 'next/link';
import { Badge, Callout, Card, CardHeader, PageHeader, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { formatDate, formatHours, percent } from '@/lib/format';
import { getOverview } from '@/lib/kri';
import { PARTS } from '@/lib/pressure';
import { requireUser } from '@/lib/session';

function detailFor(key, p) {
  return {
    missing: `${p.missing} of ${p.staff} staff, target ${p.weeklyTarget} a week`,
    teamFlags: `${percent(p.flaggedShare)} rated Medium or High${p.flagsRising ? ', rising' : ''}`,
    target: p.changes.length ? p.changes.map((c) => `${c.oldTarget} to ${c.newTarget} on ${formatDate(c.effectiveAt)}`).join(', ') : 'No increase in 180 days',
    spike: `${p.spikeRatio.toFixed(1)} times an even spread`,
    speakUp: `${p.speakUps} in 90 days`,
    response: `${formatHours(p.avgHours)} on average, ${p.speedRating.toLowerCase()}`,
    dismissals: `${p.dismissed} in 90 days`,
  }[key];
}

export default async function PressurePage() {
  await requireUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const { pressure, config } = await getOverview();
  const sorted = [...pressure].sort((a, b) => b.index - a.index);
  return (
    <div className="space-y-6">
      <PageHeader level="manager" eyebrow="Managers and targets" title="Pressure Index" description="How much pressure each branch's manager and targets place on staff, scored from 0 to 100." />
      {sorted.filter((p) => p.flagged).map((p) => (
        <Callout key={p.branchId} tone="red" icon="alert" title={`Branch ${p.code}: the manager and the target are flagged for review`}>
          {percent(p.pctMissing)} of staff ({p.missing} of {p.staff}) are missing a target of {p.weeklyTarget} accounts a week, set after {p.changes.length} increase{p.changes.length === 1 ? '' : 's'}, and employee flags are {p.flagsRising ? 'rising' : 'holding'}.
        </Callout>
      ))}
      <p className="text-[13px] text-slate-600">
        A branch is rated High when its Pressure Index is {config.pressure_flag} or more, or when at least {config.branch_high_share} percent of its staff are rated High.
      </p>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {sorted.map((p) => (
          <Card key={p.branchId} id={`branch-${p.code}`} className="scroll-mt-20">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-[15px] font-semibold text-slate-900">Branch {p.code} {p.name}</h2>
                <p className="text-xs text-slate-500">Manager {p.managerName}</p>
                <Link href={`/employees?branch=${p.code}`} className="text-xs font-medium text-indigo-700 hover:underline">{p.high} High, {p.medium} Medium of {p.staff} staff</Link>
              </div>
              <div className="text-right">
                <p className="text-[26px] font-semibold leading-none tabular-nums text-slate-900">{p.index}</p>
                <div className="mt-1"><RiskBadge level={p.rating} /></div>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              {PARTS.map((part) => (
                <div key={part.key}>
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="font-medium text-slate-700">{part.label}</span>
                    <span className="tabular-nums text-slate-500">{Math.round(p.parts[part.key])} of {part.max}</span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${(p.parts[part.key] / part.max) * 100}%` }} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{detailFor(part.key, p)}</p>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader icon="arrowUp" title="Managers" />
        <TableWrap>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Manager</th><th className={thClass}>Branch</th><th className={thClass}>Pressure Index</th><th className={thClass}>Team flag rate</th>
                <th className={thClass}>Response time</th><th className={thClass}>Speed</th><th className={thClass}>Overdue cases</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => (
                <tr key={r.branchId}>
                  <td className={`${tdClass} font-semibold`}>{r.managerName}</td>
                  <td className={tdClass}>{r.code}</td>
                  <td className={tdClass}><span className="mr-2 font-semibold tabular-nums">{r.index}</span><RiskBadge level={r.rating} /></td>
                  <td className={`${tdClass} tabular-nums`}>{percent(r.flaggedShare)}</td>
                  <td className={`${tdClass} tabular-nums`}>{formatHours(r.avgHours)}</td>
                  <td className={tdClass}><Badge tone={{ 'Unusually fast': 'amber', Prompt: 'green', Acceptable: 'neutral', Slow: 'red' }[r.speedRating] || 'neutral'}>{r.speedRating}</Badge></td>
                  <td className={`${tdClass} tabular-nums`}>{r.overdue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
