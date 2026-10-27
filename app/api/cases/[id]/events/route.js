import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M6 tiered escalation: Branch (5 days) -> Conduct Office (48h) -> CRO (24h).
// escalate: move to the next tier with a fresh deadline
// resolve:  close the case
// note:     add evidence or a comment to the audit trail
// Every action appends a timestamped CaseEvent — the case's audit trail.
const NEXT_LEVEL = { BRANCH: 'CONDUCT_OFFICE', CONDUCT_OFFICE: 'CRO' };
const NEXT_DEADLINE_HOURS = { CONDUCT_OFFICE: 48, CRO: 24 };
const LEVEL_NAME = { CONDUCT_OFFICE: 'the Conduct Office', CRO: 'the Chief Risk Officer' };

export async function POST(request, { params }) {
  const { id } = await params;
  const { action, actor, note } = await request.json();

  if (!['escalate', 'resolve', 'note'].includes(action)) {
    return NextResponse.json({ error: 'action must be escalate, resolve or note.' }, { status: 400 });
  }
  if (!actor) return NextResponse.json({ error: 'actor is required.' }, { status: 400 });

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  if (caseRecord.status === 'RESOLVED') return NextResponse.json({ error: 'Case is already resolved.' }, { status: 409 });

  if (action === 'note') {
    if (!note) return NextResponse.json({ error: 'Write a note first.' }, { status: 400 });
    await prisma.caseEvent.create({ data: { caseId: id, action: 'NOTE', actor, note } });
    return NextResponse.json({ ok: true });
  }

  if (action === 'resolve') {
    await prisma.case.update({
      where: { id },
      data: { status: 'RESOLVED', events: { create: [{ action: 'RESOLVED', actor, note: note || 'Case resolved.' }] } },
    });
    return NextResponse.json({ ok: true });
  }

  const nextLevel = NEXT_LEVEL[caseRecord.level];
  if (!nextLevel) return NextResponse.json({ error: 'Case is already at the highest level (CRO).' }, { status: 409 });

  await prisma.case.update({
    where: { id },
    data: {
      level: nextLevel,
      status: 'OPEN',
      deadlineAt: new Date(Date.now() + NEXT_DEADLINE_HOURS[nextLevel] * 60 * 60 * 1000),
      events: {
        create: [
          {
            action: 'ESCALATED',
            actor,
            note: note || `Escalated to ${LEVEL_NAME[nextLevel]} — ${NEXT_DEADLINE_HOURS[nextLevel]}h deadline.`,
          },
        ],
      },
    },
  });
  return NextResponse.json({ ok: true });
}
