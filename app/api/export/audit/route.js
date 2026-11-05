import { formatClock, formatDateTime, percent, TIER_LABELS } from '@/lib/format';
import { getCommitteeSummary } from '@/lib/kri';
import { buildPdf } from '@/lib/pdf';
import { apiUser } from '@/lib/session';

export async function GET() {
  const { error } = await apiUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const s = await getCommitteeSummary();
  const e = s.effectiveness;
  const rows = [
    { text: 'ConductGuard audit export', size: 18, bold: true, gap: 4 },
    { text: `Generated ${formatClock(s.now)}. Synthetic demonstration data.`, gap: 12 },
    { text: 'Effectiveness', size: 13, bold: true },
    { text: `Flags reviewed within deadline ${percent(e.pctOnTime)} (${e.onTime} of ${e.dueCount})` },
    { text: `False alarm rate ${percent(e.falseAlarmRate)}` },
    { text: `Unapproved threshold changes ${e.unapproved.length} (target zero)` },
    { text: `Change log ${s.chain.intact ? `intact across ${s.chain.entries.length} entries` : `BROKEN at entry ${s.chain.firstBroken}`}`, gap: 12 },
    { text: 'Cases in the audit committee summary', size: 13, bold: true },
    ...s.cases.flatMap((c) => [
      { text: `${c.ref}  ${c.title}`, bold: true },
      { text: `Tier ${TIER_LABELS[c.tier]}. Status ${c.status}. Opened ${formatDateTime(c.openedAt)}. Deadline ${formatDateTime(c.deadlineAt)}.` },
      ...c.events.map((ev) => ({ text: `  ${formatDateTime(ev.timestamp)}  ${ev.action}  ${ev.actor}. ${ev.note || ''}` })),
      { text: '', gap: 4 },
    ]),
    { text: 'Change log', size: 13, bold: true },
    ...s.chain.entries.map((l) => ({ text: `#${l.seq} ${formatDateTime(l.createdAt)} ${l.event} by ${l.changedBy}${l.signedOffBy ? `, signed off by ${l.signedOffBy}` : ''}. ${l.change} Hash ${l.hash.slice(0, 16)}` })),
  ];
  return new Response(buildPdf(rows), { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': 'attachment; filename="conductguard-audit-export.pdf"' } });
}
