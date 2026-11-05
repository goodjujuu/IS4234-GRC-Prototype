import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { canActOnCase, canViewCase } from '@/lib/access';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const STATUS_TONE = { OPEN: 'amber', UPHELD: 'green', REJECTED: 'neutral' };
const metricLabel = (key) => METRICS.find((m) => m.key === key)?.label;

export default async function DisputesPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'AUDIT_COMMITTEE']);
  const committee = user.role === 'AUDIT_COMMITTEE';
  const all = await prisma.dispute.findMany({ include: { case: true, employee: { include: { branch: true } } }, orderBy: { createdAt: 'desc' } });
  const visible = all.filter((d) => (d.type === 'APPEAL' ? committee : canViewCase(user, d.case)));
  const pending = visible.filter((d) => d.status === 'OPEN' && (d.type === 'APPEAL' ? committee : canActOnCase(user, d.case)));
  const others = visible.filter((d) => !pending.includes(d));
  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow="Employee disputes"
        title={committee ? 'Appeals and disputes' : 'Disputes'}
        description={committee ? "Appeals against case outcomes, waiting for the committee's decision." : "Employee disputes on flags, which you must decide before the case can close."}
      />
      <Card>
        <CardHeader icon="filter" title={`Waiting for your decision (${pending.length})`} />
        {pending.length === 0 && <EmptyState icon="checkCircle" title="Nothing is waiting" />}
        <div className="space-y-4">
          {pending.map((d) => {
            const base = d.type === 'APPEAL' ? '/api/appeals' : '/api/disputes';
            return (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={d.type === 'APPEAL' ? 'violet' : 'amber'}>{d.type === 'APPEAL' ? 'Appeal' : 'Dispute'}</Badge>
                  <Link href={`/cases/${d.caseId}`} className="text-sm font-semibold text-indigo-700 hover:underline">{d.case.ref}</Link>
                  <span className="text-sm font-medium text-slate-800">{d.employee.name}, Branch {d.employee.branch.code}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                </div>
                {d.metricKey && <p className="mt-2 text-[13px] text-slate-500">Disputes {metricLabel(d.metricKey)?.toLowerCase()}</p>}
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{d.statement}</p>
                {d.evidence && <p className="mt-1 text-[13px] text-slate-600"><span className="font-medium">Supporting evidence.</span> {d.evidence}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ActionForm url={`${base}/${d.id}`} extra={{ action: 'uphold' }} submitLabel="Uphold, this was a false alarm" variant="success" fields={[{ name: 'note', label: 'Reason for upholding', type: 'text', required: true }]} compact />
                  <ActionForm url={`${base}/${d.id}`} extra={{ action: 'reject' }} submitLabel="Reject" variant="secondary" fields={[{ name: 'note', label: 'Reason for rejecting', type: 'text', required: true }]} compact />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader icon="check" title={`Other disputes and appeals (${others.length})`} />
        {others.length === 0 && <p className="text-sm text-slate-500">None.</p>}
        <ul className="divide-y divide-slate-100">
          {others.map((d) => (
            <li key={d.id} className="py-2.5 text-[13px] text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/cases/${d.caseId}`} className="font-semibold text-indigo-700 hover:underline">{d.case.ref}</Link>
                <span>{d.employee.name}</span>
                <span className="text-slate-400">{d.type === 'APPEAL' ? 'Appeal' : metricLabel(d.metricKey)}</span>
                <Badge tone={STATUS_TONE[d.status]}>{d.status}</Badge>
              </div>
              {d.decisionNote && <p className="mt-1">{d.decidedBy}: {d.decisionNote}</p>}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
