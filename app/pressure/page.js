import Link from 'next/link';
import Icon from '@/components/Icon';
import { Badge, Card, PageHeader, RiskBadge, cx } from '@/components/ui';
import { formatDate, formatHours, percent } from '@/lib/format';
import { getOverview } from '@/lib/kri';
import { prisma } from '@/lib/prisma';
import { PARTS } from '@/lib/pressure';
import { requireUser } from '@/lib/session';

function detailFor(key, p) {
  return {
    missing: `${p.missing} of ${p.staff} staff miss a target of ${p.weeklyTarget} accounts a week`,
    teamFlags: `${percent(p.flaggedShare)} of staff rated Medium or High${p.flagsRising ? ', and rising' : ''}`,
    target: p.changes.length ? `Raised ${p.changes.map((c) => `${c.oldTarget} to ${c.newTarget} on ${formatDate(c.effectiveAt)}`).join(', then ')}` : 'No increase in 180 days',
    spike: `Month-end sales at ${p.spikeRatio.toFixed(1)} times an even spread`,
    speakUp: `${p.speakUps} anonymous reports in 90 days`,
    response: `Acts on flags in ${formatHours(p.avgHours)} on average, ${p.speedRating.toLowerCase()}`,
    dismissals: `${p.dismissed} dismissed for sales misconduct in 90 days`,
  }[key];
}

const BAR = { HIGH: 'bg-red-400', MEDIUM: 'bg-amber-400', LOW: 'bg-emerald-400' };

export default async function PressurePage() {
  const user = await requireUser(['CONDUCT_RISK', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const [{ pressure, config }, cases] = await Promise.all([
    getOverview(),
    prisma.case.findMany({ where: { kind: 'BRANCH_PRESSURE', status: { not: 'CLOSED' } } }),
  ]);
  const sorted = [...pressure].sort((a, b) => b.index - a.index);
  const caseFor = new Map(cases.map((c) => [c.branchId, c]));

  return (
    <div className="space-y-6">
      <PageHeader
        level="manager"
        eyebrow="Managers and Targets"
        title="Pressure Index"
        description="Monitor the pressure each branch's manager and sales target put on staff, and open the review for any manager and target that is flagged."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          ['How it is scored', 'Seven signs of pressure, such as staff missing targets and target increases, add up to a score from 0 to 100.'],
          ['When a branch is High', `At ${config.pressure_flag} or more, or when at least ${config.branch_high_share} percent of its staff are rated High.`],
          ['What happens then', 'When pressure and employee flags rise together, the manager and target are flagged and sent to you for review.'],
        ].map(([t, d]) => (
          <div key={t} className="rounded-xl border border-slate-200/80 bg-white p-4">
            <p className="text-[13px] font-semibold text-slate-800">{t}</p>
            <p className="mt-1 text-[12px] leading-snug text-slate-500">{d}</p>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        {sorted.map((p) => {
          const open = caseFor.get(p.branchId);
          const top = PARTS.map((part) => ({ ...part, pts: p.parts[part.key] })).sort((a, b) => b.pts - a.pts).filter((x) => x.pts >= 3).slice(0, 3);
          return (
            <Card key={p.branchId} padded={false} className={cx(p.rating === 'HIGH' && 'ring-1 ring-red-200')}>
              <details className="group" open={p.rating === 'HIGH'}>
                <summary className="grid cursor-pointer list-none gap-4 p-5 md:grid-cols-[1.3fr_1.4fr_1.3fr_180px] md:items-center [&::-webkit-details-marker]:hidden">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-slate-900">Branch {p.code} {p.name}</p>
                    <p className="text-[13px] text-slate-500">Manager {p.managerName}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{p.high} High and {p.medium} Medium of {p.staff} staff</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-semibold tabular-nums text-slate-900">{p.index}</span>
                      <RiskBadge level={p.rating} />
                    </div>
                    <div className="relative mt-2 h-2 rounded-full bg-slate-100">
                      <div className={cx('h-2 rounded-full', BAR[p.rating])} style={{ width: `${p.index}%` }} />
                      <span className="absolute -top-1 h-4 w-0.5 bg-slate-500" style={{ left: `${config.pressure_flag}%` }} title={`High from ${config.pressure_flag}`} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {top.length ? top.map((x) => <Badge key={x.key} tone="amber">{x.label}</Badge>) : <span className="text-[13px] text-slate-400">No strong pressure signs</span>}
                  </div>
                  <div className="flex items-center gap-3 md:justify-end">
                    {open && (user.role === 'CONDUCT_RISK' ? (
                      <Link href={`/cases/${open.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
                        Review case
                        <Icon name="arrowRight" className="h-3.5 w-3.5" />
                      </Link>
                    ) : <Badge tone="red">Flagged for review</Badge>)}
                    <Icon name="chevronDown" className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                  </div>
                </summary>
                <div className="grid gap-x-8 gap-y-3 border-t border-slate-100 p-5 sm:grid-cols-2">
                  {PARTS.map((part) => (
                    <div key={part.key}>
                      <div className="flex items-baseline justify-between gap-2 text-[13px]">
                        <span className="font-medium text-slate-700">{part.label}</span>
                        <span className="tabular-nums text-slate-500">{Math.round(p.parts[part.key])} of {part.max}</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full rounded-full bg-amber-400" style={{ width: `${(p.parts[part.key] / part.max) * 100}%` }} />
                      </div>
                      <p className="mt-1 text-xs text-slate-500">{detailFor(part.key, p)}</p>
                    </div>
                  ))}
                </div>
              </details>
            </Card>
          );
        })}
      </div>
      <p className="text-xs text-slate-500">Highest first. The tick on each bar marks the High threshold. Select a branch to see all seven signs. The index is refreshed with the daily 6:00 am data load.</p>
    </div>
  );
}
