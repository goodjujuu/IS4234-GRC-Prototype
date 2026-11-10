import Link from 'next/link';
import { CaseTable } from '@/components/CaseRows';
import Icon from '@/components/Icon';
import { Section } from '@/components/ConductView';
import { caseIndicators } from '@/components/MyConduct';
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, RiskBadge, cx } from '@/components/ui';
import { canViewCase } from '@/lib/access';
import { getNow } from '@/lib/engine';
import { OUTCOMES, formatDate, formatDateTime, isOverdue, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const INTRO = {
  CONDUCT_RISK: 'High, manager, target and dismissal cases waiting for conduct risk review.',
  CHIEF_RISK_OFFICER: 'Every case across the bank, including those escalated to you after missing their deadline.',
  INTERNAL_AUDIT: 'Every case across the bank, read-only, with its deadline and outcome.',
  AUDIT_COMMITTEE: 'Cases reported or escalated to the audit committee.',
};

// The team lead's review queue: one card per Medium flag, with what is driving it.
async function TeamLeadReviews({ user }) {
  const [all, now] = await Promise.all([
    prisma.case.findMany({ where: { branchId: user.branchId, tier: 'TEAM_LEAD' }, include: { employee: true, disputes: true }, orderBy: { deadlineAt: 'asc' } }),
    getNow(prisma),
  ]);
  const cases = all.filter((c) => canViewCase(user, c));
  const open = cases.filter((c) => c.status !== 'CLOSED');
  const closed = cases.filter((c) => c.status === 'CLOSED').sort((a, b) => b.closedAt - a.closedAt);
  return (
    <div className="space-y-8">
      <PageHeader
        level="employee"
        eyebrow={`Branch ${user.branch.code} ${user.branch.name}`}
        title="Reviews"
        description="Review each Medium flag on your team within 5 working days and record whether it is cleared, needs coaching or needs investigation."
      />

      <Section title={`Waiting for my review (${open.length})`} subtitle="Earliest deadline first. A flag not reviewed in time moves to the conduct risk team automatically.">
        {open.length === 0 ? (
          <Card><EmptyState icon="checkCircle" title="Nothing is waiting for review">New Medium flags on your team will appear here.</EmptyState></Card>
        ) : (
          <div className="space-y-3">
            {open.map((c) => {
              const drivers = caseIndicators(c.evidence).slice(0, 3);
              const disputed = c.disputes.some((d) => d.type === 'DISPUTE' && d.status === 'OPEN');
              const late = isOverdue(c, now);
              return (
                <Card key={c.id} className="flex flex-col gap-4 md:flex-row md:items-center">
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <Avatar name={c.employee?.name} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[15px] font-semibold text-slate-900">{c.employee?.name}</p>
                        <RiskBadge level={c.riskLevel} />
                        {c.status === 'IN_REVIEW' && <Badge tone="blue">In review</Badge>}
                        {disputed && <Badge tone="violet">Employee disputes this</Badge>}
                      </div>
                      <p className="mt-0.5 text-[13px] text-slate-500">{c.ref}, raised {formatDate(c.evidence?.asOf || c.openedAt)} at a score of {c.evidence?.score}</p>
                      {drivers.length > 0 && (
                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                          <span className="text-xs text-slate-500">Main drivers</span>
                          {drivers.map(({ metric }) => <Badge key={metric.key} tone="neutral">{metric.label}</Badge>)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 md:flex-col md:items-end">
                    <div className="md:text-right">
                      <p className={cx('text-sm font-semibold tabular-nums', late ? 'text-red-700' : 'text-slate-900')}>{timeLeft(c.deadlineAt, now)}</p>
                      <p className="text-xs text-slate-500">Due {formatDateTime(c.deadlineAt)}</p>
                    </div>
                    <Link href={`/cases/${c.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
                      Review
                      <Icon name="arrowRight" className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Section>

      {closed.length > 0 && (
        <Section title={`Decided (${closed.length})`} subtitle="Your past decisions. Each is in the audit trail with your reason.">
          <Card padded={false}>
            <ul className="divide-y divide-slate-100">
              {closed.map((c) => (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50">
                    <span className="w-40 text-sm font-medium text-slate-900">{c.employee?.name}</span>
                    <span className="text-[13px] text-slate-500">{c.ref}</span>
                    <Badge tone={c.outcome === 'CLEARED' ? 'green' : c.outcome === 'COACHING' ? 'amber' : 'red'}>{OUTCOMES[c.outcome]}</Badge>
                    <span className="ml-auto text-[13px] text-slate-500">Decided {formatDate(c.closedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Section>
      )}
    </div>
  );
}

export default async function CasesPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (user.role === 'TEAM_LEAD') return <TeamLeadReviews user={user} />;
  const [all, now] = await Promise.all([prisma.case.findMany({ orderBy: [{ deadlineAt: 'asc' }] }), getNow(prisma)]);
  const cases = all.filter((c) => canViewCase(user, c));
  const open = cases.filter((c) => c.status !== 'CLOSED');
  const closed = cases.filter((c) => c.status === 'CLOSED').sort((a, b) => b.closedAt - a.closedAt);
  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow="Review"
        title="Cases"
        description={INTRO[user.role]}
        actions={(
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
