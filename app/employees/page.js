import Link from 'next/link';
import { Card, PageHeader, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { latestScores } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

export default async function EmployeesPage({ searchParams }) {
  await requireUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const { branch } = await searchParams;
  const [scores, employees] = await Promise.all([latestScores(prisma), prisma.employee.findMany({ include: { branch: true } })]);
  const byId = new Map(employees.map((e) => [e.id, e]));
  const rows = scores.filter((s) => !branch || String(byId.get(s.employeeId).branch.code) === branch).sort((a, b) => b.score - a.score);
  const label = branch ? employees.find((e) => String(e.branch.code) === branch)?.branch : null;
  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow={label ? `Branch ${label.code} ${label.name}` : 'Employee conduct'}
        title="Employee profiles"
        description="Every scored employee, highest risk first, with a link to their full profile."
        actions={branch && <Link href="/employees" className="text-sm font-medium text-indigo-700 hover:underline">Show all branches</Link>}
      />
      <Card>
        <TableWrap>
          <table className="w-full min-w-[560px] border-collapse">
            <thead><tr><th className={thClass}>Employee</th><th className={thClass}>Branch</th><th className={thClass}>Score</th><th className={thClass}>Level</th></tr></thead>
            <tbody>
              {rows.map((s) => {
                const e = byId.get(s.employeeId);
                return (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td className={tdClass}><Link className="font-semibold text-indigo-700 hover:underline" href={`/employees/${e.id}`}>{e.name}</Link></td>
                    <td className={tdClass}>{e.branch.code} {e.branch.name}</td>
                    <td className={`${tdClass} tabular-nums`}>{s.score}</td>
                    <td className={tdClass}><RiskBadge level={s.level} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
