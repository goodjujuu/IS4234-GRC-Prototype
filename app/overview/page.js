import Link from 'next/link';
import { Card, CardHeader, PageHeader, RiskBadge, StatCard, TableWrap, cx, tdClass, thClass } from '@/components/ui';
import { formatHours, percent } from '@/lib/format';
import { getEffectiveness, getOverview } from '@/lib/kri';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

// One hue, darker meaning further above peers. The number is always printed.
function heatClass(z) {
  if (z < 0.5) return 'bg-slate-50 text-slate-500';
  if (z < 1) return 'bg-rose-100 text-rose-900';
  if (z < 2) return 'bg-rose-300 text-rose-950';
  return 'bg-rose-600 text-white';
}

export default async function OverviewPage() {
  await requireUser(['CONDUCT_RISK', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const [{ heat, totals, topEmployees }, e] = await Promise.all([getOverview(), getEffectiveness()]);
  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Risk Reporting" title="Live Dashboard" description="Monitor where conduct risk sits across the bank, with each branch's Pressure Index beside its employee risk and the highest risk first." />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="High risk employees" value={totals.high} tone="red" hint={`of ${totals.staff} scored`} />
        <StatCard label="Medium risk employees" value={totals.medium} tone="amber" />
        <StatCard label="Open cases" value={totals.openCases} />
        <StatCard label="Overdue cases" value={totals.overdue} tone={totals.overdue ? 'red' : 'green'} />
        <StatCard label="Managers and targets flagged" value={totals.pressureFlags} tone={totals.pressureFlags ? 'red' : 'green'} />
      </div>
      <Card>
        <CardHeader icon="chart" title="Risk heat map" subtitle="Each cell shows how far a branch's staff sit above peers on one indicator, from 0 (typical) to 3 (far above). Darker means further above. Select a branch to see its employees." />
        <TableWrap>
          <table className="w-full min-w-[1040px] border-separate border-spacing-[2px]">
            <thead>
              <tr>
                <th className={thClass}>Branch</th>
                <th className={thClass}>Rating</th>
                <th className={thClass}>Pressure Index</th>
                <th className={thClass}>High</th>
                {METRICS.map((m) => <th key={m.key} className="px-2 pb-2 text-left align-bottom text-[11px] font-semibold leading-tight text-slate-500">{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {heat.map((b) => (
                <tr key={b.branchId}>
                  <td className="whitespace-nowrap px-3 py-2 text-[13px]">
                    <Link href={`/employees?branch=${b.code}`} className="font-semibold text-indigo-700 hover:underline">Branch {b.code}</Link>
                    <span className="ml-1 text-slate-500">{b.name}</span>
                  </td>
                  <td className="px-3 py-2"><RiskBadge level={b.rating} /></td>
                  <td className="px-3 py-2 text-[13px] font-semibold tabular-nums"><Link href="/pressure" className="hover:underline">{b.index}</Link></td>
                  <td className="whitespace-nowrap px-3 py-2 text-[13px] tabular-nums">{b.high} of {b.staff}</td>
                  {METRICS.map((m) => {
                    const z = b.metricAverages[m.key];
                    return (
                      <td key={m.key} className={cx('rounded-md px-2 py-2 text-center text-[13px] font-medium tabular-nums', heatClass(z))} title={`Branch ${b.code}, ${m.label}: ${z.toFixed(1)} above peers`}>
                        {z.toFixed(1)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span>Distance above peers</span>
          {[['Under 0.5', 0], ['0.5 to 1', 0.7], ['1 to 2', 1.5], ['2 and over', 2.5]].map(([label, z]) => (
            <span key={label} className="flex items-center gap-1.5"><span className={cx('inline-block h-3 w-5 rounded-sm', heatClass(z))} />{label}</span>
          ))}
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader icon="user" title="Highest-risk employees" subtitle="Select a name to open the profile." />
          <TableWrap>
            <table className="w-full min-w-[360px] border-collapse">
              <thead><tr><th className={thClass}>Employee</th><th className={thClass}>Branch</th><th className={thClass}>Score</th><th className={thClass}>Level</th></tr></thead>
              <tbody>
                {topEmployees.map((t) => (
                  <tr key={t.employeeId}>
                    <td className={tdClass}><Link className="font-semibold text-indigo-700 hover:underline" href={`/employees/${t.employeeId}`}>{t.name}</Link></td>
                    <td className={tdClass}>{t.code}</td>
                    <td className={`${tdClass} tabular-nums`}>{t.score}</td>
                    <td className={tdClass}><RiskBadge level={t.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
        <div className="space-y-5">
          <Card>
            <CardHeader icon="checkCircle" title="Effectiveness" />
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div><dt className="text-xs text-slate-500">Reviewed within deadline, target 95%</dt><dd className="mt-0.5 font-semibold tabular-nums">{percent(e.pctOnTime)}</dd></div>
              <div><dt className="text-xs text-slate-500">Average time to resolve</dt><dd className="mt-0.5 font-semibold tabular-nums">{formatHours(e.avgHours)}</dd></div>
              <div><dt className="text-xs text-slate-500">False alarm rate</dt><dd className="mt-0.5 font-semibold tabular-nums">{percent(e.falseAlarmRate)}</dd></div>
              <div><dt className="text-xs text-slate-500">Unexpected configuration changes, target 0</dt><dd className="mt-0.5 font-semibold tabular-nums">{e.unexpected.length}</dd></div>
            </dl>
          </Card>
        </div>
      </div>
    </div>
  );
}
