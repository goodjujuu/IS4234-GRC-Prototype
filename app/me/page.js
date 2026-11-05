import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import { IndicatorNotice, ScoreSummary, FlaggedAccounts } from '@/components/EmployeeRecord';
import { Badge, Card, CardHeader, EmptyState, PageHeader, RiskBadge } from '@/components/ui';
import { getNow } from '@/lib/engine';
import { CASE_KINDS, OUTCOMES, formatDateTime, timeLeft } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { getEmployeeRecord } from '@/lib/record';
import { METRICS } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

const DISPUTE_TONE = { OPEN: 'amber', UPHELD: 'green', REJECTED: 'neutral' };
const DISPUTE_TEXT = { OPEN: 'With your reviewer', UPHELD: 'Upheld', REJECTED: 'Rejected' };

export default async function MyDashboard() {
  const user = await requireUser(['EMPLOYEE']);
  const [record, cases, now] = await Promise.all([
    getEmployeeRecord(user.employeeId),
    prisma.case.findMany({ where: { employeeId: user.employeeId, kind: 'EMPLOYEE_FLAG' }, include: { disputes: { orderBy: { createdAt: 'desc' } } }, orderBy: { openedAt: 'desc' } }),
    getNow(prisma),
  ]);
  const open = cases.filter((c) => c.status !== 'CLOSED');
  const metricOptions = METRICS.map((m) => ({ value: m.key, label: m.label }));

  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow={`${record.employee.position}, Branch ${record.employee.branch.code} ${record.employee.branch.name}`}
        title="My dashboard"
        description="Your risk score, how your metrics compare with your peers, and any flags on your record."
        actions={<Link href="/me/data" className="text-sm font-medium text-indigo-700 hover:underline">See all data held about me</Link>}
      />
      <IndicatorNotice />

      <Card>
        <CardHeader icon="briefcase" title="Flags on my record" subtitle="A named reviewer looks at every flag. You can dispute an open flag, and appeal the outcome." />
        {cases.length === 0 ? (
          <EmptyState icon="checkCircle" title="No flags on your record">Your metrics are within the normal range for your role.</EmptyState>
        ) : (
          <div className="space-y-4">
            {cases.map((c) => {
              const hasOpenDispute = c.disputes.some((d) => d.status === 'OPEN');
              const appealed = c.disputes.some((d) => d.type === 'APPEAL');
              return (
                <div key={c.id} className="rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">{c.ref}</span>
                    <RiskBadge level={c.riskLevel} />
                    <Badge tone={c.status === 'CLOSED' ? 'neutral' : 'blue'}>
                      {c.status === 'CLOSED' ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : `Under review, ${timeLeft(c.deadlineAt, now)}`}
                    </Badge>
                    <span className="text-xs text-slate-500">{CASE_KINDS[c.kind]}, opened {formatDateTime(c.openedAt)}</span>
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{c.summary}</p>
                  {c.assignee && <p className="mt-1 text-[13px] text-slate-600">Your reviewer is {c.assignee}.</p>}
                  {c.closeReason && <p className="mt-1 text-[13px] text-slate-600">Reviewer&rsquo;s reason: {c.closeReason}</p>}

                  {c.disputes.map((d) => (
                    <div key={d.id} className="mt-3 rounded-lg bg-slate-50 p-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[13px] font-semibold text-slate-700">{d.type === 'APPEAL' ? 'Your appeal' : 'Your dispute'}</span>
                        <Badge tone={DISPUTE_TONE[d.status]}>{d.type === 'APPEAL' && d.status === 'OPEN' ? 'With the audit committee' : DISPUTE_TEXT[d.status]}</Badge>
                        <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                      </div>
                      <p className="mt-1 text-[13px] text-slate-600">{d.statement}</p>
                      {d.evidence && <p className="mt-1 text-[13px] text-slate-600">Your evidence: {d.evidence}</p>}
                      {d.decisionNote && <p className="mt-1 text-[13px] text-slate-600">Decision by {d.decidedBy}: {d.decisionNote}</p>}
                    </div>
                  ))}

                  {c.status !== 'CLOSED' && !hasOpenDispute && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-[13px] font-semibold text-slate-700">Dispute this flag</p>
                      <ActionForm
                        url="/api/disputes"
                        extra={{ caseId: c.id }}
                        submitLabel="Submit dispute"
                        fields={[
                          { name: 'metricKey', label: 'Which metric do you dispute?', type: 'select', options: metricOptions },
                          { name: 'statement', label: 'What should the reviewer know?', type: 'textarea', required: true, placeholder: 'For example, the context behind these accounts.' },
                          { name: 'evidence', label: 'Supporting evidence', type: 'text', placeholder: 'For example, a signed form or appointment notes.' },
                        ]}
                      />
                    </div>
                  )}

                  {c.status === 'CLOSED' && c.outcome !== 'CLEARED' && !appealed && (
                    <div className="mt-4 border-t border-slate-100 pt-4">
                      <p className="mb-2 text-[13px] font-semibold text-slate-700">Disagree with this outcome? Appeal to the audit committee</p>
                      <ActionForm
                        url="/api/appeals"
                        extra={{ caseId: c.id }}
                        submitLabel="Submit appeal"
                        variant="secondary"
                        fields={[
                          { name: 'statement', label: 'Why do you disagree?', type: 'textarea', required: true },
                          { name: 'evidence', label: 'Supporting evidence', type: 'text' },
                        ]}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {open.length > 0 && (
          <p className="mt-3 text-[13px] text-slate-600">
            If targets are behind this pattern, you can tell us without giving your name through the{' '}
            <Link href="/speak-up" className="font-medium text-indigo-700 hover:underline">protected speak-up channel</Link>.
          </p>
        )}
      </Card>

      <ScoreSummary record={record} viewer="self" />
      <FlaggedAccounts accounts={record.flaggedAccounts} />
    </div>
  );
}
