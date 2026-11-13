import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// A leading =, +, - or @ would run as a formula in a spreadsheet, so it is neutralised.
function csv(value) {
  const text = value === null || value === undefined ? '' : value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replace(/"/g, '""')}"`;
}

export async function GET() {
  const { error } = await apiUser(['CONDUCT_RISK', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const cases = await prisma.case.findMany({ include: { employee: true, branch: true, events: { orderBy: { timestamp: 'asc' } } }, orderBy: { openedAt: 'asc' } });
  const header = ['Case', 'Kind', 'Level', 'Tier', 'Status', 'Outcome', 'Branch', 'Subject', 'Opened', 'Deadline', 'Closed', 'Event time', 'Event', 'Actor', 'Note'];
  const rows = cases.flatMap((c) =>
    c.events.map((e) => [c.ref, c.kind, c.riskLevel, c.tier, c.status, c.outcome, c.branch?.code, c.employee?.name, c.openedAt, c.deadlineAt, c.closedAt, e.timestamp, e.action, e.actor, e.note]),
  );
  const body = [header, ...rows].map((r) => r.map(csv).join(',')).join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="conductguard-audit-trail.csv"' } });
}
