import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { ActionButton, ActionForm } from '@/components/actions';
import { CaseTimeline } from '@/components/CaseRows';
import { BranchCase } from '@/components/BranchCase';
import { EmployeeFlagCase } from '@/components/EmployeeFlagCase';
import { Badge, Callout, Card, CardHeader, PageHeader, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { canActOnCase, canViewCase } from '@/lib/access';
import { getNow, latestScores, loadConfig, pressureAt } from '@/lib/engine';
import { CASE_KINDS, OUTCOMES, TIER_LABELS, deadlineText, formatDate, formatDateTime, formatHours, isOverdue, outcomesFor, percent } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { METRICS, formatMetric } from '@/lib/scoring';
import { requireUser } from '@/lib/session';

export default async function CasePage({ params }) {
  const { id } = await params;
  const user = await requireUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  const [c, now] = await Promise.all([
    prisma.case.findUnique({ where: { id }, include: { employee: true, branch: true, events: { orderBy: { timestamp: 'asc' } }, disputes: { include: { employee: true } } } }),
    getNow(prisma),
  ]);
  if (!c) notFound();
  if (!canViewCase(user, c)) redirect('/cases');
  const canAct = canActOnCase(user, c);
  if (c.kind === 'EMPLOYEE_FLAG' && c.employee) {
    const config = await loadConfig(prisma);
    return <EmployeeFlagCase c={c} now={now} canAct={canAct} thresholds={{ medium: config.level_medium, high: config.level_high }} />;
  }
  if (['BRANCH_PRESSURE', 'DISMISSAL_REVIEW'].includes(c.kind) && c.branch) {
    const [config, scores, employees, dismissals] = await Promise.all([
      loadConfig(prisma),
      latestScores(prisma),
      prisma.employee.findMany({ where: { branchId: c.branchId } }),
      prisma.dismissal.findMany({ where: { branchId: c.branchId, category: 'SALES_MISCONDUCT' }, include: { employee: true }, orderBy: { dismissedAt: 'desc' } }),
    ]);
    const names = new Map(employees.map((e) => [e.id, e.name]));
    const team = scores.filter((s) => s.branchId === c.branchId).sort((a, b) => b.score - a.score).map((s) => ({ employeeId: s.employeeId, name: names.get(s.employeeId), score: s.score, level: s.level }));
    const pressureNow = scores[0] ? (await pressureAt(prisma, scores[0].asOf, config)).find((x) => x.branchId === c.branchId) : null;
    return <BranchCase c={c} now={now} canAct={canAct} team={team} dismissals={dismissals} pressureNow={pressureNow} config={config} />;
  }
  const metrics = c.evidence?.metrics;
  const p = c.evidence?.pressure;
  const showEmployeeLink = c.employee && c.kind === 'EMPLOYEE_FLAG';

  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow={`${c.ref}, ${CASE_KINDS[c.kind]}`}
        title={c.title}
        description="The evidence, audit trail and review actions for this case."
        actions={showEmployeeLink && <Link href={`/employees/${c.employeeId}`} className="text-sm font-medium text-indigo-700 hover:underline">Open employee profile</Link>}
      />
      <div className="flex flex-wrap items-center gap-2 text-[13px]">
        <RiskBadge level={c.riskLevel} />
        <Badge tone={c.status === 'CLOSED' ? 'neutral' : c.status === 'IN_REVIEW' ? 'blue' : 'amber'}>{c.status === 'CLOSED' ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : c.status === 'IN_REVIEW' ? 'In review' : 'Open'}</Badge>
        <Badge tone="neutral">Routed to {TIER_LABELS[c.tier]}</Badge>
        {c.inCommitteeSummary && <Badge tone="violet">In audit committee summary</Badge>}
        {c.status !== 'CLOSED' && <span className={isOverdue(c, now) ? 'font-semibold text-red-700' : 'text-slate-500'}>{deadlineText(c, now)}</span>}
        {c.assignee && <span className="text-slate-500">Reviewer {c.assignee}</span>}
      </div>

      {c.kind === 'RETALIATION_GUARD' && (
        <Callout tone="violet" icon="shield" title="The reporter stays anonymous">
          This case records that a protected reporter has since been flagged or dismissed. The content of any report is not linked here.
        </Callout>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.25fr_1fr]">
        <div className="space-y-5">
          <Card>
            <CardHeader icon="alert" title="Why this case opened" />
            <p className="text-[13px] leading-relaxed text-slate-600">{c.summary}</p>
          </Card>
          {metrics && (
            <Card>
              <CardHeader icon="sliders" title={`Evidence, score ${c.evidence.score}`} subtitle={`As calculated when this case opened, ${formatDateTime(c.evidence.asOf)}. It does not change if thresholds change later.`} />
              <TableWrap>
                <table className="w-full min-w-[460px] border-collapse">
                  <thead><tr><th className={thClass}>Metric</th><th className={thClass}>Employee</th><th className={thClass}>Peers</th><th className={thClass}>Points</th></tr></thead>
                  <tbody>
                    {METRICS.map((m) => (
                      <tr key={m.key}>
                        <td className={tdClass}>{m.label}</td>
                        <td className={`${tdClass} tabular-nums font-medium`}>{formatMetric(m.unit, metrics[m.key].value)}</td>
                        <td className={`${tdClass} tabular-nums`}>{formatMetric(m.unit, metrics[m.key].median)}</td>
                        <td className={`${tdClass} tabular-nums`}>{metrics[m.key].contribution}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          )}
          {p && (
            <Card>
              <CardHeader icon="radar" title={`Evidence, Pressure Index ${p.index}`} />
              <ul className="space-y-1 text-[13px] text-slate-600">
                <li>{percent(p.pctMissing)} of staff are missing target ({p.missing} of {p.staff}).</li>
                <li>The target rose {percent(p.targetIncrease)} in 180 days.</li>
                <li>End-of-month sales run at {p.spikeRatio.toFixed(1)} times an even spread.</li>
                <li>{p.speakUps} anonymous speak-up reports in 90 days.</li>
                <li>{percent(p.flaggedShare)} of the team are rated Medium or High{p.flagsRising ? ', and flags are rising' : ''}.</li>
                <li>The manager acts on flags in {formatHours(p.avgHours)} on average.</li>
                <li>{p.dismissed} sales misconduct dismissals in 90 days.</li>
              </ul>
            </Card>
          )}
          {c.evidence?.accounts?.length > 0 && (
            <Card>
              <CardHeader icon="filter" title="Accounts behind this flag" subtitle="Customers appear only as pseudonymous references." />
              <TableWrap>
                <table className="w-full min-w-[460px] border-collapse">
                  <thead><tr><th className={thClass}>Account</th><th className={thClass}>Opened</th><th className={thClass}>Why flagged</th></tr></thead>
                  <tbody>
                    {c.evidence.accounts.map((a) => (
                      <tr key={a.ref}>
                        <td className={`${tdClass} whitespace-nowrap tabular-nums`}>{a.ref}</td>
                        <td className={`${tdClass} whitespace-nowrap`}>{formatDate(a.openedAt)}</td>
                        <td className={tdClass}>{a.reasons.join(', ')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </Card>
          )}
          {c.disputes.length > 0 && (
            <Card>
              <CardHeader icon="filter" title="Disputes and Appeals" />
              {c.disputes.map((d) => (
                <div key={d.id} className="text-[13px] text-slate-600">
                  <p><span className="font-semibold text-slate-800">{d.employee.name}</span> {d.type === 'APPEAL' ? 'appealed the outcome' : `disputes ${METRICS.find((m) => m.key === d.metricKey)?.label.toLowerCase()}`}. <Badge tone="neutral">{d.status}</Badge></p>
                  <p className="mt-1">{d.statement}</p>
                  {d.evidence && <p className="mt-1"><span className="font-medium">Supporting evidence.</span> {d.evidence}</p>}
                  {d.decisionNote && <p className="mt-1">Decision by {d.decidedBy}: {d.decisionNote}</p>}
                </div>
              ))}
              {user.role === 'AUDIT_COMMITTEE' && <Link href="/disputes" className="mt-2 inline-block text-[13px] font-medium text-indigo-700 hover:underline">Open appeals</Link>}
            </Card>
          )}
          <Card>
            <CardHeader icon="clock" title="Audit trail" subtitle="Every action, with its time and who took it." />
            <CaseTimeline events={c.events} format={formatDateTime} />
          </Card>
        </div>

        <div className="space-y-5">
          {c.status === 'CLOSED' && (
            <Card>
              <CardHeader icon="check" title={`Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}`} subtitle={formatDateTime(c.closedAt)} />
              <p className="text-[13px] text-slate-600">{c.closeReason}</p>
            </Card>
          )}
          {canAct ? (
            <>
              <Card>
                <CardHeader icon="user" title="Review" />
                <div className="flex flex-wrap gap-2">
                  {c.assignee !== user.name && <ActionButton url={`/api/cases/${c.id}`} body={{ action: 'assign', assignee: user.name }} icon="user">Assign to me</ActionButton>}
                  {c.status === 'OPEN' && <ActionButton url={`/api/cases/${c.id}`} body={{ action: 'start' }} icon="play">Start review</ActionButton>}
                </div>
                <div className="mt-4">
                  <ActionForm url={`/api/cases/${c.id}`} extra={{ action: 'note' }} submitLabel="Add note" variant="secondary" fields={[{ name: 'note', label: 'Note for the audit trail', type: 'textarea', rows: 2, required: true }]} />
                </div>
              </Card>
              <Card>
                <CardHeader icon="checkCircle" title="Close with a reason" />
                <ActionForm
                  url={`/api/cases/${c.id}`}
                  extra={{ action: 'close' }}
                  submitLabel="Close case"
                  resultTone="amber"
                  fields={[
                    { name: 'outcome', label: 'Outcome', type: 'select', options: outcomesFor(c.kind), hint: outcomesFor(c.kind).length > 3 ? 'A target review sends the target for adjustment, which fixes the cause of the pressure.' : undefined },
                    { name: 'reason', label: 'Reason', type: 'textarea', rows: 3, required: true },
                  ]}
                />
              </Card>
            </>
          ) : c.status !== 'CLOSED' ? (
            <Callout tone="neutral" icon="lock">This case is routed to {TIER_LABELS[c.tier]}. Your access is read-only.</Callout>
          ) : null}
        </div>
      </div>
    </div>
  );
}
