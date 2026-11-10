import Link from 'next/link';
import { ActionButton, ActionForm } from '@/components/actions';
import { CaseTimeline } from '@/components/CaseRows';
import { Section } from '@/components/ConductView';
import { FlagReason } from '@/components/FlagReason';
import Icon from '@/components/Icon';
import { caseIndicators } from '@/components/MyConduct';
import { Badge, Callout, Card, PageHeader, RiskBadge, TableWrap, cx, tdClass, thClass } from '@/components/ui';
import { OUTCOMES, TIER_LABELS, formatDate, formatDateTime, isOverdue, outcomesFor, timeLeft } from '@/lib/format';
import { METRICS } from '@/lib/scoring';

const OUTCOME_HELP = {
  CLEARED: 'No concern found. The flag closes with no action.',
  COACHING: 'Talk to the employee about how they sell and record what was agreed.',
  INVESTIGATION: 'Refer it for a formal investigation of the accounts.',
};
const DISPUTE_TONE = { OPEN: 'violet', UPHELD: 'green', REJECTED: 'neutral' };

// The review screen for one employee flag: the facts, why it was raised, the evidence,
// any dispute, the audit trail and the reviewer's decision.
export function EmployeeFlagCase({ c, now, canAct, thresholds }) {
  const ev = c.evidence || {};
  const closed = c.status === 'CLOSED';
  const openDispute = c.disputes.find((d) => d.type === 'DISPUTE' && d.status === 'OPEN');
  const levelText = c.riskLevel === 'HIGH' ? 'High' : 'Medium';
  const metricLabel = (key) => METRICS.find((m) => m.key === key)?.label;
  const late = isOverdue(c, now);

  const facts = [
    ['Employee', c.employee?.name, `${c.employee?.position}, Branch ${c.branch?.code}`],
    ['Score when raised', ev.score != null ? `${ev.score} of 100` : 'Not recorded', `${levelText} from ${c.riskLevel === 'HIGH' ? thresholds.high : thresholds.medium}`],
    ['Reviewer', c.assignee || TIER_LABELS[c.tier], TIER_LABELS[c.tier]],
    closed ? ['Decided', formatDate(c.closedAt), OUTCOMES[c.outcome]] : ['Decision due', formatDateTime(c.deadlineAt), timeLeft(c.deadlineAt, now)],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow={`${c.ref}, employee flag`}
        title={`Review: ${c.employee?.name}`}
        description="Check why this employee was flagged and the accounts behind it, then record your decision with a reason."
        actions={<Link href={`/employees/${c.employeeId}`} className="text-sm font-medium text-indigo-700 hover:underline">Open employee profile</Link>}
      />

      <Card>
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge level={c.riskLevel} />
          <Badge tone={closed ? 'neutral' : c.status === 'IN_REVIEW' ? 'blue' : 'amber'}>{closed ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : c.status === 'IN_REVIEW' ? 'In review' : 'Not started'}</Badge>
          {openDispute && <Badge tone="violet">Employee disputes this</Badge>}
          {c.inCommitteeSummary && <Badge tone="neutral">In audit committee summary</Badge>}
        </div>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {facts.map(([k, v, note], i) => (
            <div key={k}>
              <dt className="text-xs text-slate-500">{k}</dt>
              <dd className="mt-0.5 text-sm font-semibold text-slate-900">{v}</dd>
              <dd className={cx('text-xs', i === 3 && !closed && late ? 'font-semibold text-red-700' : 'text-slate-500')}>{note}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          <Section title="Why this flag was raised" subtitle={`The score reached ${ev.score}, above the ${levelText} threshold. These indicators were above peers in the same role and added the most points.`}>
            <FlagReason flag={c} self={false} />
            <p className="mt-2 text-xs text-slate-500">As calculated on {ev.asOf ? formatDateTime(ev.asOf) : 'the day the flag was raised'}. This evidence does not change if thresholds change later.</p>
          </Section>

          {ev.accounts?.length > 0 && (
            <Section title="Accounts behind this flag" subtitle="The accounts with the most warning signs. Customers appear only as references.">
              <Card>
                <TableWrap>
                  <table className="w-full min-w-[520px] border-collapse">
                    <thead><tr><th className={thClass}>Account</th><th className={thClass}>Product</th><th className={thClass}>Opened</th><th className={thClass}>Warning signs</th></tr></thead>
                    <tbody>
                      {ev.accounts.map((a) => (
                        <tr key={a.ref}>
                          <td className={cx(tdClass, 'whitespace-nowrap font-medium tabular-nums')}>{a.ref}</td>
                          <td className={tdClass}>{a.product}</td>
                          <td className={cx(tdClass, 'whitespace-nowrap')}>{formatDate(a.openedAt)}</td>
                          <td className={tdClass}><div className="flex flex-wrap gap-1">{a.reasons.map((r) => <Badge key={r} tone="neutral">{r}</Badge>)}</div></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableWrap>
              </Card>
            </Section>
          )}

          {c.disputes.length > 0 && (
            <Section title="Employee's response" subtitle="A dispute must be decided before the case can close. An upheld dispute clears the flag and counts as a false alarm.">
              <div className="space-y-3">
                {c.disputes.map((d) => (
                  <Card key={d.id}>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{d.type === 'APPEAL' ? 'Appeal to the audit committee' : `Dispute, ${metricLabel(d.metricKey) || 'whole flag'}`}</p>
                      <Badge tone={DISPUTE_TONE[d.status]}>{d.status === 'OPEN' ? (d.type === 'APPEAL' ? 'With the audit committee' : 'Waiting for your decision') : d.status === 'UPHELD' ? 'Upheld' : 'Rejected'}</Badge>
                      <span className="text-xs text-slate-500">{formatDateTime(d.createdAt)}</span>
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-slate-700">&ldquo;{d.statement}&rdquo;</p>
                    {d.evidence && <p className="mt-1 text-[13px] text-slate-600"><span className="font-medium">Evidence.</span> {d.evidence}</p>}
                    {d.decisionNote && <p className="mt-2 text-[13px] text-slate-600">Decision by {d.decidedBy}: {d.decisionNote}</p>}
                    {canAct && d.type === 'DISPUTE' && d.status === 'OPEN' && (
                      <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
                        <ActionForm url={`/api/disputes/${d.id}`} extra={{ action: 'uphold' }} submitLabel="Uphold, clear the flag" variant="success" fields={[{ name: 'note', label: 'Why you agree', type: 'text', required: true }]} compact />
                        <ActionForm url={`/api/disputes/${d.id}`} extra={{ action: 'reject' }} submitLabel="Reject the dispute" variant="secondary" fields={[{ name: 'note', label: 'Why you disagree', type: 'text', required: true }]} compact />
                      </div>
                    )}
                  </Card>
                ))}
              </div>
            </Section>
          )}

          <Section title="Audit trail" subtitle="Every action on this case with its time and who took it. It cannot be edited.">
            <Card><CaseTimeline events={c.events} format={formatDateTime} /></Card>
          </Section>
        </div>

        <div className="space-y-4 lg:sticky lg:top-6">
          {closed ? (
            <Card>
              <p className="text-base font-semibold text-slate-900">Decision</p>
              <div className="mt-2"><Badge tone={c.outcome === 'CLEARED' ? 'green' : c.outcome === 'COACHING' ? 'amber' : 'red'}>{OUTCOMES[c.outcome]}</Badge></div>
              <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{c.closeReason}</p>
              <p className="mt-2 text-xs text-slate-500">{c.assignee}, {formatDateTime(c.closedAt)}</p>
            </Card>
          ) : canAct ? (
            <Card>
              <p className="text-base font-semibold text-slate-900">Your decision</p>
              <ol className="mt-3 space-y-2 text-[13px] text-slate-600">
                {['Check why the flag was raised and the accounts behind it.', 'Decide any dispute from the employee.', 'Choose an outcome and give your reason.'].map((t, i) => (
                  <li key={t} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">{i + 1}</span>{t}</li>
                ))}
              </ol>
              {c.status === 'OPEN' && (
                <div className="mt-4">
                  <ActionButton url={`/api/cases/${c.id}`} body={{ action: 'start' }} icon="play">Start review</ActionButton>
                </div>
              )}
              <div className="mt-5 border-t border-slate-100 pt-4">
                {openDispute ? (
                  <Callout tone="violet" icon="alert">Decide the employee&rsquo;s dispute first. The case cannot close while it is open.</Callout>
                ) : (
                  <>
                    <ul className="mb-4 space-y-1.5 text-[12px] text-slate-500">
                      {outcomesFor(c.kind).map((o) => <li key={o.value}><span className="font-semibold text-slate-700">{o.label}.</span> {OUTCOME_HELP[o.value]}</li>)}
                    </ul>
                    <ActionForm
                      url={`/api/cases/${c.id}`}
                      extra={{ action: 'close' }}
                      submitLabel="Record decision"
                      resultTone="amber"
                      fields={[
                        { name: 'outcome', label: 'Outcome', type: 'select', options: outcomesFor(c.kind) },
                        { name: 'reason', label: 'Reason', type: 'textarea', rows: 3, required: true, placeholder: 'What you checked and why you chose this outcome.' },
                      ]}
                    />
                  </>
                )}
              </div>
              <details className="group mt-5 border-t border-slate-100 pt-4">
                <summary className="flex cursor-pointer list-none items-center justify-between text-[13px] font-medium text-slate-700 [&::-webkit-details-marker]:hidden">
                  Add a note to the audit trail
                  <Icon name="chevronDown" className="h-4 w-4 text-slate-400 transition group-open:rotate-180" />
                </summary>
                <div className="mt-3">
                  <ActionForm url={`/api/cases/${c.id}`} extra={{ action: 'note' }} submitLabel="Add note" variant="secondary" fields={[{ name: 'note', label: 'Note', type: 'textarea', rows: 2, required: true }]} compact />
                </div>
              </details>
            </Card>
          ) : (
            <Callout tone="neutral" icon="lock">This case is routed to {TIER_LABELS[c.tier]}. Your access is read-only.</Callout>
          )}
          {caseIndicators(ev).length === 0 && !closed && <p className="text-xs text-slate-500">No indicator was above peers when this flag was raised.</p>}
        </div>
      </div>
    </div>
  );
}
