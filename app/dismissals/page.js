import { Card, CardHeader, PageHeader, TableWrap, tdClass, thClass } from '@/components/ui';
import { formatDate, formatMonth } from '@/lib/format';
import { getCommitteeSummary } from '@/lib/kri';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export default async function DismissalsPage() {
  await requireUser(['CONDUCT_RISK', 'AUDIT_COMMITTEE']);
  const [summary, dismissals] = await Promise.all([
    getCommitteeSummary(),
    prisma.dismissal.findMany({ include: { employee: true, branch: true }, orderBy: { dismissedAt: 'desc' } }),
  ]);
  const max = Math.max(1, ...summary.months.map((m) => m.total));
  return (
    <div className="space-y-6">
      <PageHeader level="manager" eyebrow="Managers and targets" title="Sales misconduct dismissals" description="Sales misconduct dismissals by month and branch, each of which opens a review of the branch and its manager." />
      <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
        <Card>
          <CardHeader icon="chart" title="Sales misconduct dismissals by month" subtitle="All branches" />
          <div className="flex h-36 items-end gap-3" role="img" aria-label="Dismissals per month for the last six months">
            {summary.months.map((m) => (
              <div key={m.start.toISOString()} className="flex h-full flex-1 flex-col justify-end text-center" title={`${formatMonth(m.start)}: ${m.total} dismissals, ${m.branch12} at Branch 12`}>
                <span className="mb-1 text-xs font-semibold tabular-nums text-slate-700">{m.total}</span>
                <div className="rounded-t bg-indigo-500" style={{ height: `${Math.max(2, (m.total / max) * 75)}%` }} />
                <span className="mt-1 text-[10px] text-slate-500">{formatMonth(m.start).split(' ')[0]}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[13px] text-slate-600">
            By branch: {Object.entries(summary.dismissalsByBranch).sort((a, b) => b[1] - a[1]).map(([code, n]) => `Branch ${code} ${n}`).join(', ')}.
          </p>
        </Card>
        <Card>
          <CardHeader icon="building" title={`All dismissals (${dismissals.length})`} />
          <TableWrap>
            <table className="w-full min-w-[480px] border-collapse">
              <thead><tr><th className={thClass}>Date</th><th className={thClass}>Employee</th><th className={thClass}>Branch</th><th className={thClass}>Reason</th></tr></thead>
              <tbody>
                {dismissals.map((d) => (
                  <tr key={d.id}>
                    <td className={`${tdClass} whitespace-nowrap`}>{formatDate(d.dismissedAt)}</td>
                    <td className={tdClass}>{d.employee.name}</td>
                    <td className={tdClass}>{d.branch.code}</td>
                    <td className={tdClass}>{d.reason}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        </Card>
      </div>
    </div>
  );
}
