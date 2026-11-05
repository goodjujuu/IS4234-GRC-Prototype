import Link from 'next/link';
import { Card, CardHeader, PageHeader, RiskBadge, StatCard, TableWrap, tdClass, thClass } from '@/components/ui';
import { latestScores } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { METRICS, formatMetric } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const SHOWN = METRICS.slice(0, 3);

export default async function TeamPage() {
  const user = await requireUser(['TEAM_LEAD']);
  const [all, employees, reviews] = await Promise.all([
    latestScores(prisma),
    prisma.employee.findMany({ where: { branchId: user.branchId, isManager: false, status: 'ACTIVE' } }),
    prisma.case.count({ where: { branchId: user.branchId, tier: 'TEAM_LEAD', status: { not: 'CLOSED' } } }),
  ]);
  const scores = all.filter((s) => s.branchId === user.branchId).sort((a, b) => b.score - a.score);
  const name = new Map(employees.map((e) => [e.id, e]));
  return (
    <div className="space-y-6">
      <PageHeader level="employee" eyebrow={`Branch ${user.branch.code} ${user.branch.name}`} title="My team" description="Risk scores and key metrics for everyone on your team." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Team members" value={scores.length} />
        <StatCard label="High or Medium" value={scores.filter((s) => s.level !== 'LOW').length} tone="amber" />
        <StatCard label="Reviews waiting for me" value={reviews} hint={<Link className="text-indigo-700 hover:underline" href="/cases">Open my reviews</Link>} />
      </div>
      <Card>
        <CardHeader icon="chart" title="Team metrics" />
        <TableWrap>
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr>
                <th className={thClass}>Employee</th><th className={thClass}>Score</th><th className={thClass}>Level</th>
                {SHOWN.map((m) => <th key={m.key} className={thClass}>{m.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td className={tdClass}><Link className="font-semibold text-indigo-700 hover:underline" href={`/employees/${s.employeeId}`}>{name.get(s.employeeId)?.name}</Link></td>
                  <td className={`${tdClass} tabular-nums`}>{s.score}</td>
                  <td className={tdClass}><RiskBadge level={s.level} /></td>
                  {SHOWN.map((m) => <td key={m.key} className={`${tdClass} tabular-nums`}>{formatMetric(m.unit, s.metrics[m.key].value)}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
