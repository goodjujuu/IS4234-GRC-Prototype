import Link from 'next/link';
import { Badge, RiskBadge, TableWrap, tdClass, thClass } from '@/components/ui';
import { CASE_KINDS, OUTCOMES, TIER_LABELS, deadlineText, formatDate, isOverdue } from '@/lib/format';

export function CaseTable({ cases, now }) {
  return (
    <TableWrap>
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr>
            <th className={thClass}>Case</th>
            <th className={thClass}>Level</th>
            <th className={thClass}>Type</th>
            <th className={thClass}>Reviewer</th>
            <th className={thClass}>Deadline</th>
            <th className={thClass}>Status</th>
          </tr>
        </thead>
        <tbody>
          {cases.map((c) => (
            <tr key={c.id} className="hover:bg-slate-50">
              <td className={tdClass}>
                <Link href={`/cases/${c.id}`} className="font-semibold text-indigo-700 hover:underline">{c.ref}</Link>
                <p className="mt-0.5 text-slate-600">{c.title}</p>
              </td>
              <td className={tdClass}><RiskBadge level={c.riskLevel} /></td>
              <td className={`${tdClass} whitespace-nowrap`}>{CASE_KINDS[c.kind]}</td>
              <td className={`${tdClass} whitespace-nowrap`}>{c.assignee || TIER_LABELS[c.tier]}</td>
              <td className={`${tdClass} whitespace-nowrap`}>
                {c.status === 'CLOSED' ? formatDate(c.closedAt) : <span className={isOverdue(c, now) ? 'font-semibold text-red-700' : ''}>{deadlineText(c, now)}</span>}
              </td>
              <td className={`${tdClass} whitespace-nowrap`}>
                {c.status === 'CLOSED' ? <Badge tone="neutral">Closed, {OUTCOMES[c.outcome]?.toLowerCase()}</Badge> : c.status === 'IN_REVIEW' ? <Badge tone="blue">In review</Badge> : <Badge tone="amber">Open</Badge>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableWrap>
  );
}

const ACTION_LABELS = {
  OPENED: 'Opened', ASSIGNED: 'Assigned', REVIEW_STARTED: 'Review started', NOTE: 'Note', ESCALATED: 'Escalated',
  DISPUTED: 'Disputed', DISPUTE_DECIDED: 'Dispute decided', CLOSED: 'Closed', APPEALED: 'Appealed', APPEAL_DECIDED: 'Appeal decided',
};

// The audit trail. Every entry has a time and a named actor.
export function CaseTimeline({ events, format }) {
  return (
    <ol className="space-y-3 border-l-2 border-slate-200 pl-4">
      {events.map((e) => (
        <li key={e.id} className="relative">
          <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-slate-400" />
          <p className="text-[13px] font-semibold text-slate-800">{ACTION_LABELS[e.action] || e.action}<span className="ml-2 font-normal text-slate-500">{e.actor}, {format(e.timestamp)}</span></p>
          {e.note && <p className="mt-0.5 text-[13px] leading-relaxed text-slate-600">{e.note}</p>}
        </li>
      ))}
    </ol>
  );
}
