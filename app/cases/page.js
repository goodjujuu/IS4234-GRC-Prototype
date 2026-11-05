import { CaseTable } from '@/components/CaseRows';
import { Card, CardHeader, EmptyState, PageHeader } from '@/components/ui';
import { canViewCase } from '@/lib/access';
import { getNow } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const INTRO = {
  TEAM_LEAD: 'Medium cases for your team, each with 5 working days to review.',
  CONDUCT_RISK: 'High, manager, target and dismissal cases waiting for conduct risk review.',
  CHIEF_RISK_OFFICER: 'Every case across the bank, including those escalated to you after missing their deadline.',
  INTERNAL_AUDIT: 'Every case across the bank, read-only, with its deadline and outcome.',
  AUDIT_COMMITTEE: 'Cases reported or escalated to the audit committee.',
};

export default async function CasesPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const [all, now] = await Promise.all([prisma.case.findMany({ orderBy: [{ deadlineAt: 'asc' }] }), getNow(prisma)]);
  const cases = all.filter((c) => canViewCase(user, c));
  const open = cases.filter((c) => c.status !== 'CLOSED');
  const closed = cases.filter((c) => c.status === 'CLOSED').sort((a, b) => b.closedAt - a.closedAt);
  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow="Review"
        title={user.role === 'TEAM_LEAD' ? 'Reviews' : 'Cases'}
        description={INTRO[user.role]}
        actions={user.role !== 'TEAM_LEAD' && (
          <>
            <a href="/api/export/cases" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Export CSV</a>
            <a href="/api/export/audit" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Export PDF</a>
          </>
        )}
      />
      <Card>
        <CardHeader icon="briefcase" title={`Open (${open.length})`} />
        {open.length ? <CaseTable cases={open} now={now} /> : <EmptyState icon="checkCircle" title="Nothing is waiting for review" />}
      </Card>
      {closed.length > 0 && (
        <Card>
          <CardHeader icon="check" title={`Closed (${closed.length})`} />
          <CaseTable cases={closed} now={now} />
        </Card>
      )}
    </div>
  );
}
