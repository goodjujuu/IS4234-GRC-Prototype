import Link from 'next/link';
import { CaseTable } from '@/components/CaseRows';
import Icon from '@/components/Icon';
import { Section } from '@/components/ConductView';
import { caseIndicators } from '@/components/MyConduct';
import { Avatar, Badge, Card, CardHeader, EmptyState, PageHeader, RiskBadge, cx } from '@/components/ui';
import { canViewCase } from '@/lib/access';
import { getNow } from '@/lib/engine';
import { CASE_KINDS, OUTCOMES, TIER_LABELS, formatDate, formatDateTime, isOverdue, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/session';

const INTRO = {
  CHIEF_RISK_OFFICER: 'Decide the High cases escalated to you after the conduct risk team missed the 48-hour deadline.',
  INTERNAL_AUDIT: 'Check every case across the bank, read-only, for whether it was reviewed on time and properly decided.',
  AUDIT_COMMITTEE: 'Decide the cases escalated to the committee and read those reported to it.',
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
        description="Review each Medium flag on your team within 5 business days and record whether it is cleared, needs coaching or needs investigation."
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

const exportLinks = (
  <>
    <a href="/api/export/cases" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Export CSV</a>
    <a href="/api/export/audit" className="inline-flex h-8 items-center rounded-lg bg-white px-3 text-[13px] font-medium text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50">Export PDF</a>
  </>
);

// One line on what the case is about, so the queue can be read without opening each case.
function caseSubject(c) {
  if (c.kind === 'EMPLOYEE_FLAG') return { who: c.employee?.name, what: `Branch ${c.branch?.code}, score ${c.evidence?.score ?? ''}` };
  if (c.kind === 'BRANCH_PRESSURE') return { who: `Branch ${c.branch?.code} ${c.branch?.name}`, what: `Manager ${c.employee?.name}, Pressure Index ${c.evidence?.pressure?.index ?? ''}` };
  if (c.kind === 'DISMISSAL_REVIEW') return { who: `Branch ${c.branch?.code} ${c.branch?.name}`, what: 'A sales misconduct dismissal to check for a wider pattern' };
  return { who: `Branch ${c.branch?.code}`, what: 'A protected reporter was later flagged or dismissed' };
}

// The conduct risk team's queue: their own High, manager, target and dismissal cases first,
// then oversight of everything with other reviewers.
async function ConductRiskCases({ user }) {
  const [all, now] = await Promise.all([
    prisma.case.findMany({ include: { employee: true, branch: true, disputes: true }, orderBy: { deadlineAt: 'asc' } }),
    getNow(prisma),
  ]);
  const open = all.filter((c) => c.status !== 'CLOSED');
  const mine = open.filter((c) => c.tier === 'CONDUCT_RISK');
  const others = open.filter((c) => c.tier !== 'CONDUCT_RISK');
  const closed = all.filter((c) => c.status === 'CLOSED').sort((a, b) => b.closedAt - a.closedAt);
  const managerCases = mine.filter((c) => c.kind === 'BRANCH_PRESSURE' || c.kind === 'DISMISSAL_REVIEW');
  const employeeCases = mine.filter((c) => c.kind === 'EMPLOYEE_FLAG');
  const queueRow = (c) => {
    const { who, what } = caseSubject(c);
    const late = isOverdue(c, now);
    const disputed = c.disputes.some((d) => d.type === 'DISPUTE' && d.status === 'OPEN');
    const drivers = c.kind === 'EMPLOYEE_FLAG' ? caseIndicators(c.evidence).slice(0, 3) : [];
    return (
      <li key={c.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-900">{who}</p>
            <RiskBadge level={c.riskLevel} />
            {c.kind === 'DISMISSAL_REVIEW' && <Badge tone="neutral">Dismissal</Badge>}
            {c.status === 'IN_REVIEW' && <Badge tone="blue">In review</Badge>}
            {disputed && <Badge tone="violet">Employee disputes this</Badge>}
          </div>
          <p className="mt-0.5 text-[13px] text-slate-500">{c.ref}, {what}</p>
          {drivers.length > 0 && (
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-slate-500">Main drivers</span>
              {drivers.map(({ metric }) => <Badge key={metric.key} tone="neutral">{metric.label}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className={cx('text-sm font-semibold tabular-nums', late ? 'text-red-700' : 'text-slate-900')}>{timeLeft(c.deadlineAt, now)}</p>
            <p className="text-xs text-slate-500">{c.assignee}</p>
          </div>
          <Link href={`/cases/${c.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-900 px-4 text-[13px] font-medium text-white hover:bg-slate-800">
            Review
            <Icon name="arrowRight" className="h-3.5 w-3.5" />
          </Link>
        </div>
      </li>
    );
  };
  const queues = [
    {
      key: 'manager',
      icon: 'radar',
      title: 'Managers and targets',
      cases: managerCases,
      accent: 'border-t-amber-500',
      chip: 'bg-amber-50 text-amber-700',
      reviews: 'The pressure behind the conduct. Check the branch target, how the manager responds to flags and whether dismissals form a pattern.',
      deadline: '5 business days',
      outcomes: 'Cleared, coaching, investigation or target review',
    },
    {
      key: 'employee',
      icon: 'user',
      title: 'High risk employees',
      cases: employeeCases,
      accent: 'border-t-sky-500',
      chip: 'bg-sky-50 text-sky-700',
      reviews: 'One employee\'s conduct. Check the indicators above peers, the accounts behind them and any dispute from the employee.',
      deadline: '48 hours',
      outcomes: 'Cleared, coaching or investigation',
    },
  ];
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Case Management"
        title="Cases"
        description="Review the manager, target and High employee cases routed to the conduct risk team, and keep an eye on cases with other reviewers."
        actions={exportLinks}
      />

      <Section title={`Waiting for conduct risk review (${mine.length})`} subtitle="Manager and target cases come first because they deal with the cause of the pressure, not only its effect.">
        <div className="space-y-5">
          {queues.map((q) => (
            <Card key={q.key} padded={false} className={cx('overflow-hidden border-t-4', q.accent)}>
              <div className="border-b border-slate-100 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={cx('flex h-8 w-8 items-center justify-center rounded-lg', q.chip)}><Icon name={q.icon} className="h-4 w-4" /></span>
                  <h3 className="text-[15px] font-semibold text-slate-900">{q.title} ({q.cases.length})</h3>
                </div>
                <dl className="mt-3 grid gap-3 text-[13px] sm:grid-cols-[2fr_1fr_1.4fr]">
                  <div><dt className="text-xs text-slate-500">What you review</dt><dd className="mt-0.5 text-slate-700">{q.reviews}</dd></div>
                  <div><dt className="text-xs text-slate-500">Deadline</dt><dd className="mt-0.5 font-medium text-slate-800">{q.deadline}</dd></div>
                  <div><dt className="text-xs text-slate-500">Outcomes</dt><dd className="mt-0.5 text-slate-700">{q.outcomes}</dd></div>
                </dl>
              </div>
              {q.cases.length === 0 ? (
                <p className="px-5 py-4 text-[13px] text-slate-500">Nothing is waiting.</p>
              ) : (
                <ul className="divide-y divide-slate-100">{q.cases.map(queueRow)}</ul>
              )}
            </Card>
          ))}
        </div>
      </Section>

      <Section title={`With other reviewers (${others.length})`} subtitle="Medium flags with team leads, and cases escalated to the Chief Risk Officer or the audit committee. A Medium flag not reviewed in time moves to you.">
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {others.map((c) => {
              const { who } = caseSubject(c);
              return (
                <li key={c.id}>
                  <Link href={`/cases/${c.id}`} className="grid gap-1 px-5 py-3 hover:bg-slate-50 sm:grid-cols-[1.4fr_1fr_1fr_auto] sm:items-center sm:gap-4">
                    <span className="flex items-center gap-2 text-sm font-medium text-slate-900">{who}<RiskBadge level={c.riskLevel} /></span>
                    <span className="text-[13px] text-slate-500">{c.ref}, {CASE_KINDS[c.kind].toLowerCase()}</span>
                    <span className="text-[13px] text-slate-600">{TIER_LABELS[c.tier]}{c.assignee ? `, ${c.assignee}` : ''}</span>
                    <span className={cx('text-[13px] tabular-nums sm:text-right', isOverdue(c, now) ? 'font-semibold text-red-700' : 'text-slate-600')}>{timeLeft(c.deadlineAt, now)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      </Section>

      <Section title={`Recently decided (${closed.length})`} subtitle="The latest outcomes across the bank. Export the full list with its audit trail above.">
        <Card padded={false}>
          <ul className="divide-y divide-slate-100">
            {closed.slice(0, 8).map((c) => (
              <li key={c.id}>
                <Link href={`/cases/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 hover:bg-slate-50">
                  <span className="w-44 text-sm font-medium text-slate-900">{caseSubject(c).who}</span>
                  <span className="text-[13px] text-slate-500">{c.ref}</span>
                  <Badge tone={c.outcome === 'CLEARED' ? 'green' : c.outcome === 'COACHING' ? 'amber' : 'red'}>{OUTCOMES[c.outcome]}</Badge>
                  <span className="ml-auto text-[13px] text-slate-500">{c.assignee}, {formatDate(c.closedAt)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </Section>
    </div>
  );
}

export default async function CasesPage() {
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (user.role === 'TEAM_LEAD') return <TeamLeadReviews user={user} />;
  if (user.role === 'CONDUCT_RISK') return <ConductRiskCases user={user} />;
  const [all, now] = await Promise.all([prisma.case.findMany({ orderBy: [{ deadlineAt: 'asc' }] }), getNow(prisma)]);
  // The Chief Risk Officer only handles cases escalated to them.
  const cases = all.filter((c) => canViewCase(user, c) && (user.role !== 'CHIEF_RISK_OFFICER' || c.tier === 'CHIEF_RISK_OFFICER'));
  const open = cases.filter((c) => c.status !== 'CLOSED');
  const closed = cases.filter((c) => c.status === 'CLOSED').sort((a, b) => b.closedAt - a.closedAt);
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Case Management"
        title={user.role === 'INTERNAL_AUDIT' ? 'Cases' : 'Escalated Cases'}
        description={INTRO[user.role]}
        actions={exportLinks}
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
