import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M6 — SLA sweep. Any unresolved case past its deadline escalates
// automatically, with no manual hand-off:
//   Branch (5 days) missed         -> Conduct Office, 48h
//   Conduct Office (48h) missed    -> Chief Risk Officer, 24h
//   CRO (24h) missed               -> marked overdue and reported to the Board
// `fastForwardHours` (demo only) moves every open deadline that much earlier,
// as if that much time had passed.
const NEXT = {
  BRANCH: { level: 'CONDUCT_OFFICE', hours: 48, note: 'Branch did not act within 5 days — auto-escalated to the Conduct Office (48h).' },
  CONDUCT_OFFICE: { level: 'CRO', hours: 24, note: 'Conduct Office did not resolve within 48 hours — auto-escalated to the Chief Risk Officer (24h).' },
};

export async function POST(request) {
  const { fastForwardHours = 0 } = await request.json().catch(() => ({}));
  const shift = Math.max(0, Math.min(24 * 30, Number(fastForwardHours) || 0)) * 60 * 60 * 1000;

  let open = await prisma.case.findMany({ where: { status: { not: 'RESOLVED' } }, include: { events: true, alert: true } });
  if (shift) {
    await Promise.all(
      open.map((c) => prisma.case.update({ where: { id: c.id }, data: { deadlineAt: new Date(c.deadlineAt.getTime() - shift) } })),
    );
    open = open.map((c) => ({ ...c, deadlineAt: new Date(c.deadlineAt.getTime() - shift) }));
  }

  const now = Date.now();
  const actions = [];
  for (const c of open.filter((x) => x.deadlineAt.getTime() < now)) {
    const next = NEXT[c.level];
    if (next) {
      await prisma.case.update({
        where: { id: c.id },
        data: {
          level: next.level,
          status: 'OPEN',
          deadlineAt: new Date(now + next.hours * 60 * 60 * 1000),
          events: { create: [{ action: 'ESCALATED', actor: 'System (SLA sweep)', note: next.note }] },
        },
      });
      actions.push({ caseId: c.id, from: c.level, to: next.level, note: next.note, alertType: c.alert.type });
    } else if (!c.events.some((e) => e.action === 'BOARD_NOTIFIED')) {
      const note = 'Chief Risk Officer deadline missed — case reported to the Board Risk Committee.';
      await prisma.case.update({
        where: { id: c.id },
        data: { status: 'OVERDUE', events: { create: [{ action: 'BOARD_NOTIFIED', actor: 'System (SLA sweep)', note }] } },
      });
      actions.push({ caseId: c.id, from: 'CRO', to: 'BOARD', note, alertType: c.alert.type });
    }
  }

  return NextResponse.json({ actions, fastForwardHours: shift / 3600000 });
}
