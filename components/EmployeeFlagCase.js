import Link from 'next/link';
import { ActionForm } from '@/components/actions';
import { CaseFacts, DecisionPanel } from '@/components/CaseDecision';
import { CaseTimeline } from '@/components/CaseRows';
import { Section } from '@/components/ConductView';
import { FlagReason } from '@/components/FlagReason';
import { caseIndicators } from '@/components/MyConduct';
import { Badge, Card, PageHeader, TableWrap, cx, tdClass, thClass } from '@/components/ui';
import { OUTCOMES, TIER_LABELS, formatDate, formatDateTime, timeLeft } from '@/lib/format';
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

  const facts = [
    ['Employee', c.employee?.name, `${c.employee?.position}, Branch ${c.branch?.code}`],
    ['Score when raised', ev.score != null ? `${ev.score} of 100` : 'Not recorded', `${levelText} from ${c.riskLevel === 'HIGH' ? thresholds.high : thresholds.medium}`],
    ['Reviewer', c.assignee || TIER_LABELS[c.tier], TIER_LABELS[c.tier]],
    closed ? ['Decided', formatDate(c.closedAt), OUTCOMES[c.outcome]] : ['Decision due', formatDateTime(c.deadlineAt), timeLeft(c.deadlineAt, now), true],
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        level="employee"
        eyebrow={`${c.ref}, employee flag`}
        title={`Review: ${c.employee?.name}`}
        description={canAct ? 'Check why this employee was flagged and the accounts behind it, then record your decision with a reason.' : 'Check why this employee was flagged, the accounts behind it and how the case was handled.'}
        actions={<Link href={`/employees/${c.employeeId}`} className="text-sm font-medium text-indigo-700 hover:underline">Open employee profile</Link>}
      />

      <CaseFacts c={c} now={now} facts={facts} badges={openDispute && <Badge tone="violet">Employee disputes this</Badge>} />

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

        <div className="space-y-4">
          <DecisionPanel
            c={c}
            canAct={canAct}
            steps={['Check why the flag was raised and the accounts behind it.', 'Decide any dispute from the employee.', 'Choose an outcome and give your reason.']}
            help={OUTCOME_HELP}
            blocked={openDispute && 'Decide the employee\u2019s dispute first. The case cannot close while it is open.'}
          />
          {caseIndicators(ev).length === 0 && !closed && <p className="text-xs text-slate-500">No indicator was above peers when this flag was raised.</p>}
        </div>
      </div>
    </div>
  );
}
