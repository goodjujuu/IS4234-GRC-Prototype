import Icon from '@/components/Icon';
import { Card, PageHeader, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { OUTCOMES, formatDate } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const FUNDING = { EXTERNAL: 'External', INTERNAL_TRANSFER_ONLY: 'Own transfer only', NONE: 'None' };

// One kind of data: what it is, where it comes from, how many records, and the records themselves.
function DataSection({ icon, title, source, use, count, children }) {
  return (
    <details className="group rounded-2xl border border-slate-200/80 bg-white shadow-card">
      <summary className="flex cursor-pointer list-none items-center gap-4 p-5 [&::-webkit-details-marker]:hidden">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
          <Icon name={icon} className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-slate-900">{title}</p>
          <p className="mt-0.5 text-[13px] text-slate-500">{use} From {source}.</p>
        </div>
        <span className="shrink-0 text-xl font-semibold tabular-nums text-slate-900">{count}</span>
        <Icon name="chevronDown" className="h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180" />
      </summary>
      <div className="border-t border-slate-100 p-5 pt-4">{children}</div>
    </details>
  );
}

function Table({ head, rows, minWidth = 560 }) {
  return (
    <TableWrap>
      <table className="w-full border-collapse" style={{ minWidth }}>
        <thead><tr>{head.map((h) => <th key={h} className={thClass}>{h}</th>)}</tr></thead>
        <tbody>{rows}</tbody>
      </table>
    </TableWrap>
  );
}

export default async function MyDataPage() {
  const user = await requireUser(['EMPLOYEE']);
  const [employee, accounts, complaints, scores, cases] = await Promise.all([
    prisma.employee.findUnique({ where: { id: user.employeeId }, include: { branch: true } }),
    prisma.accountRecord.findMany({ where: { employeeId: user.employeeId }, orderBy: { openedAt: 'desc' } }),
    prisma.complaint.findMany({ where: { employeeId: user.employeeId }, include: { account: true }, orderBy: { receivedAt: 'desc' } }),
    prisma.riskScore.findMany({ where: { employeeId: user.employeeId }, orderBy: { asOf: 'desc' } }),
    prisma.case.findMany({ where: { employeeId: user.employeeId }, include: { disputes: true }, orderBy: { openedAt: 'desc' } }),
  ]);
  const td = (extra = '') => `${tdClass} ${extra}`;

  return (
    <div className="space-y-4">
      <PageHeader level="employee" eyebrow="My Conduct Record" title="My Personal Data" description="Open any section to see every record ConductGuard holds about you and where it comes from." />

      <Card>
        <dl className="grid gap-4 text-sm sm:grid-cols-3">
          {[['Name', employee.name], ['Role', employee.position], ['Branch', `${employee.branch.code} ${employee.branch.name}`]].map(([k, v]) => (
            <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="mt-0.5 font-medium text-slate-800">{v}</dd></div>
          ))}
        </dl>
        <p className="mt-4 border-t border-slate-100 pt-4 text-[13px] text-slate-600">
          ConductGuard holds only conduct-related data and uses it only for conduct monitoring, never for pay. Speak-up reports are not linked to your name.
        </p>
      </Card>

      <DataSection icon="filter" title="Accounts I opened" source="the core banking system and the customer records audit log" use="Used for every conduct metric." count={accounts.length}>
        <Table
          minWidth={720}
          head={['Account', 'Customer', 'Product', 'Opened', 'First genuine use', 'Funding', 'Contact change', 'Closed']}
          rows={accounts.map((a) => (
            <tr key={a.id}>
              <td className={td('tabular-nums')}>{a.ref}</td>
              <td className={td('tabular-nums')}>{a.customerRef}</td>
              <td className={td()}>{a.product}</td>
              <td className={td('whitespace-nowrap')}>{formatDate(a.openedAt)}</td>
              <td className={td('whitespace-nowrap')}>{a.firstGenuineActivityAt ? formatDate(a.firstGenuineActivityAt) : 'None yet'}</td>
              <td className={td('whitespace-nowrap')}>{FUNDING[a.fundingSource]}</td>
              <td className={td('whitespace-nowrap')}>{a.contactChangeAt ? formatDate(a.contactChangeAt) : 'None'}</td>
              <td className={td('whitespace-nowrap')}>{a.closedAt ? formatDate(a.closedAt) : 'Open'}</td>
            </tr>
          ))}
        />
      </DataSection>

      <DataSection icon="inbox" title="Complaints linked to my accounts" source="the complaints system" use="Used for the customer complaint rate." count={complaints.length}>
        {complaints.length === 0 ? <p className="text-sm text-slate-500">No complaints are linked to your accounts.</p> : (
          <Table
            head={['Received', 'Account', 'Type', 'Summary']}
            rows={complaints.map((c) => (
              <tr key={c.id}>
                <td className={td('whitespace-nowrap')}>{formatDate(c.receivedAt)}</td>
                <td className={td('tabular-nums')}>{c.account.ref}</td>
                <td className={td('whitespace-nowrap')}>{c.category === 'DID_NOT_AUTHORISE' ? 'Did not authorise' : 'Service'}</td>
                <td className={td()}>{c.summary}</td>
              </tr>
            ))}
          />
        )}
      </DataSection>

      <DataSection icon="chart" title="My risk scores" source="ConductGuard's daily scoring" use="Calculated from the records above." count={scores.length}>
        <Table
          minWidth={360}
          head={['Calculated', 'Score', 'Level']}
          rows={scores.map((s) => (
            <tr key={s.id}>
              <td className={td()}>{formatDate(s.asOf)}</td>
              <td className={td('tabular-nums')}>{s.score}</td>
              <td className={td()}><RiskBadge level={s.level} /></td>
            </tr>
          ))}
        />
      </DataSection>

      <DataSection icon="briefcase" title="My cases and disputes" source="ConductGuard's case management" use="Opened when your score reaches Medium or High." count={cases.length}>
        {cases.length === 0 ? <p className="text-sm text-slate-500">You have no cases on record.</p> : (
          <Table
            head={['Case', 'Level', 'Opened', 'Status', 'Disputes and appeals']}
            rows={cases.map((c) => (
              <tr key={c.id}>
                <td className={td('tabular-nums')}>{c.ref}</td>
                <td className={td()}><RiskBadge level={c.riskLevel} /></td>
                <td className={td('whitespace-nowrap')}>{formatDate(c.openedAt)}</td>
                <td className={td('whitespace-nowrap')}>{c.status === 'CLOSED' ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : 'Under review'}</td>
                <td className={td('tabular-nums')}>{c.disputes.length}</td>
              </tr>
            ))}
          />
        )}
      </DataSection>
    </div>
  );
}
