import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import { Badge, Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { formatDateTime } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const STATUS_TONE = { OPEN: 'amber', UPHELD: 'green', REJECTED: 'neutral' };

export default async function DisputesPage() {
  await requireUser(['AUDIT_COMMITTEE']);
  const appeals = await prisma.dispute.findMany({ where: { type: 'APPEAL' }, include: { case: true, employee: { include: { branch: true } } }, orderBy: { createdAt: 'desc' } });
  const pending = appeals.filter((d) => d.status === 'OPEN');
  const others = appeals.filter((d) => d.status !== 'OPEN');
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Case Management"
        title="Appeals"
        description="Decide employee appeals against case outcomes, which come straight to the committee."
      />
      <Card>
        <CardHeader icon="filter" title={`Waiting for your decision (${pending.length})`} />
        {pending.length === 0 && <EmptyState icon="checkCircle" title="Nothing is waiting" />}
        <div className="space-y-4">
          {pending.map((d) => {
            const base = '/api/appeals';
            return (
              <div key={d.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/cases/${d.caseId}`} className="text-sm font-semibold text-indigo-700 hover:underline">{d.case.ref}</Link>
                  <span className="text-sm font-medium text-slate-800">{d.employee.name}, Branch {d.employee.branch.code}</span>
                  <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-slate-700">{d.statement}</p>
                {d.evidence && <p className="mt-1 text-[13px] text-slate-600"><span className="font-medium">Supporting evidence.</span> {d.evidence}</p>}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <ActionForm url={`${base}/${d.id}`} extra={{ action: 'uphold' }} submitLabel="Uphold, overturn the outcome" variant="success" fields={[{ name: 'note', label: 'Reason for upholding', type: 'text', required: true }]} compact />
                  <ActionForm url={`${base}/${d.id}`} extra={{ action: 'reject' }} submitLabel="Reject" variant="secondary" fields={[{ name: 'note', label: 'Reason for rejecting', type: 'text', required: true }]} compact />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card>
        <CardHeader icon="check" title={`Decided appeals (${others.length})`} />
        {others.length === 0 && <p className="text-sm text-slate-500">None.</p>}
        <ul className="divide-y divide-slate-100">
          {others.map((d) => (
            <li key={d.id} className="py-2.5 text-[13px] text-slate-600">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/cases/${d.caseId}`} className="font-semibold text-indigo-700 hover:underline">{d.case.ref}</Link>
                <span>{d.employee.name}</span>
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
