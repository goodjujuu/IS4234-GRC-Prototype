import { ActionButton, ActionForm } from '@/components/actions';
import Icon from '@/components/Icon';
import { Badge, Callout, Card, cx } from '@/components/ui';
import { OUTCOMES, TIER_LABELS, formatDateTime, isOverdue, outcomesFor } from '@/lib/format';

export const OUTCOME_TONE = { CLEARED: 'green', COACHING: 'amber', INVESTIGATION: 'red', TARGET_REVIEW: 'violet' };

// The key facts strip at the top of every review screen.
export function CaseFacts({ c, now, facts, badges }) {
  const closed = c.status === 'CLOSED';
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={c.riskLevel === 'HIGH' ? 'red' : 'amber'} dot>{c.riskLevel === 'HIGH' ? 'High' : 'Medium'}</Badge>
        <Badge tone={closed ? 'neutral' : c.status === 'IN_REVIEW' ? 'blue' : 'amber'}>{closed ? `Closed, ${OUTCOMES[c.outcome]?.toLowerCase()}` : c.status === 'IN_REVIEW' ? 'In review' : 'Not started'}</Badge>
        {badges}
        {c.inCommitteeSummary && <Badge tone="neutral">In audit committee summary</Badge>}
      </div>
      <dl className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map(([k, v, note, urgent]) => (
          <div key={k}>
            <dt className="text-xs text-slate-500">{k}</dt>
            <dd className="mt-0.5 text-sm font-semibold text-slate-900">{v}</dd>
            {note && <dd className={cx('text-xs', urgent && !closed && isOverdue(c, now) ? 'font-semibold text-red-700' : 'text-slate-500')}>{note}</dd>}
          </div>
        ))}
      </dl>
    </Card>
  );
}

// The reviewer's side panel: the decision once made, a guided form while the case is open
// and the reviewer may act, otherwise a read-only note.
export function DecisionPanel({ c, canAct, steps, help, blocked }) {
  if (c.status === 'CLOSED') {
    return (
      <Card>
        <p className="text-base font-semibold text-slate-900">Decision</p>
        <div className="mt-2"><Badge tone={OUTCOME_TONE[c.outcome]}>{OUTCOMES[c.outcome]}</Badge></div>
        <p className="mt-2 text-[13px] leading-relaxed text-slate-600">{c.closeReason}</p>
        <p className="mt-2 text-xs text-slate-500">{c.assignee}, {formatDateTime(c.closedAt)}</p>
      </Card>
    );
  }
  if (!canAct) return <Callout tone="neutral" icon="lock">This case is routed to {TIER_LABELS[c.tier]}. Your access is read-only.</Callout>;
  const outcomes = outcomesFor(c.kind);
  return (
    <Card>
      <p className="text-base font-semibold text-slate-900">Your decision</p>
      <ol className="mt-3 space-y-2 text-[13px] text-slate-600">
        {steps.map((t, i) => (
          <li key={t} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-700">{i + 1}</span>{t}</li>
        ))}
      </ol>
      {c.status === 'OPEN' && (
        <div className="mt-4">
          <ActionButton url={`/api/cases/${c.id}`} body={{ action: 'start' }} icon="play">Start review</ActionButton>
        </div>
      )}
      <div className="mt-5 border-t border-slate-100 pt-4">
        {blocked ? (
          <Callout tone="violet" icon="alert">{blocked}</Callout>
        ) : (
          <>
            <ul className="mb-4 space-y-1.5 text-[12px] text-slate-500">
              {outcomes.map((o) => <li key={o.value}><span className="font-semibold text-slate-700">{o.label}.</span> {help[o.value]}</li>)}
            </ul>
            <ActionForm
              url={`/api/cases/${c.id}`}
              extra={{ action: 'close' }}
              submitLabel="Record decision"
              resultTone="amber"
              fields={[
                { name: 'outcome', label: 'Outcome', type: 'select', options: outcomes },
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
  );
}
