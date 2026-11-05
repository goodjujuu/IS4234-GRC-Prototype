import { Card, CardHeader, PageHeader, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { formatDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

// Data minimisation made visible: an employee can see everything held about them.
export default async function MyDataPage() {
  const user = await requireUser(['EMPLOYEE']);
  const [employee, accountCount, accounts, complaints, scores, cases] = await Promise.all([
    prisma.employee.findUnique({ where: { id: user.employeeId }, include: { branch: true } }),
    prisma.accountRecord.count({ where: { employeeId: user.employeeId } }),
    prisma.accountRecord.findMany({ where: { employeeId: user.employeeId }, orderBy: { openedAt: 'desc' }, take: 25 }),
    prisma.complaint.findMany({ where: { employeeId: user.employeeId }, include: { account: true }, orderBy: { receivedAt: 'desc' } }),
    prisma.riskScore.findMany({ where: { employeeId: user.employeeId }, orderBy: { asOf: 'desc' } }),
    prisma.case.count({ where: { employeeId: user.employeeId } }),
  ]);
  return (
    <div className="space-y-6">
      <PageHeader level="employee" eyebrow="My conduct record" title="Data held about me" description="Everything ConductGuard holds about you." />
      <Card>
        <CardHeader icon="user" title="Identity and role" />
        <dl className="grid gap-3 text-sm sm:grid-cols-4">
          {[['Name', employee.name], ['Role', employee.position], ['Branch', `${employee.branch.code} ${employee.branch.name}`], ['Cases on record', cases]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-medium text-slate-800">{v}</dd></div>
          ))}
        </dl>
      </Card>
      <Card>
        <CardHeader icon="chart" title={`Risk scores (${scores.length})`} />
        <TableWrap>
          <table className="w-full min-w-[360px] border-collapse">
            <thead><tr><th className={thClass}>Calculated</th><th className={thClass}>Score</th><th className={thClass}>Level</th></tr></thead>
            <tbody>
              {scores.map((s) => (
                <tr key={s.id}><td className={tdClass}>{formatDate(s.asOf)}</td><td className={`${tdClass} tabular-nums`}>{s.score}</td><td className={tdClass}><RiskBadge level={s.level} /></td></tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <Card>
        <CardHeader icon="inbox" title={`Complaints linked to my accounts (${complaints.length})`} />
        <TableWrap>
          <table className="w-full min-w-[560px] border-collapse">
            <thead><tr><th className={thClass}>Received</th><th className={thClass}>Account</th><th className={thClass}>Type</th><th className={thClass}>Summary</th></tr></thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(c.receivedAt)}</td>
                  <td className={`${tdClass} tabular-nums`}>{c.account.ref}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{c.category === 'DID_NOT_AUTHORISE' ? 'Did not authorise' : 'Service'}</td>
                  <td className={tdClass}>{c.summary}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
      <Card>
        <CardHeader icon="filter" title={`Account activity records (${accountCount})`} subtitle="The 25 most recent are shown." />
        <TableWrap>
          <table className="w-full min-w-[640px] border-collapse">
            <thead><tr><th className={thClass}>Account</th><th className={thClass}>Customer</th><th className={thClass}>Product</th><th className={thClass}>Opened</th><th className={thClass}>First genuine use</th><th className={thClass}>Funding</th></tr></thead>
            <tbody>
              {accounts.map((a) => (
                <tr key={a.id}>
                  <td className={`${tdClass} tabular-nums`}>{a.ref}</td>
                  <td className={`${tdClass} tabular-nums`}>{a.customerRef}</td>
                  <td className={tdClass}>{a.product}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{formatDate(a.openedAt)}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{a.firstGenuineActivityAt ? formatDate(a.firstGenuineActivityAt) : 'None yet'}</td>
                  <td className={`${tdClass} whitespace-nowrap`}>{{ EXTERNAL: 'External', INTERNAL_TRANSFER_ONLY: 'Own transfer only', NONE: 'None' }[a.fundingSource]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TableWrap>
      </Card>
    </div>
  );
}
