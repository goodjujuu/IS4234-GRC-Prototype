import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M6 tiered escalation: Branch (5 days) -> Conduct Office (48h) -> CRO (24h).
// Overdue or repeated-pattern cases escalate to the next tier; resolving
// closes the case. Every transition appends a timestamped CaseEvent.
const NEXT_LEVEL = {
  BRANCH: 'CONDUCT_OFFICE',
  CONDUCT_OFFICE: 'CRO',
};
const NEXT_DEADLINE_HOURS = {
  CONDUCT_OFFICE: 48,
  CRO: 24,
};

export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { action, actor, note } = body; // action: 'escalate' | 'resolve'

  if (!['escalate', 'resolve'].includes(action)) {
    return NextResponse.json({ error: 'action must be escalate or resolve.' }, { status: 400 });
  }
  if (!actor) {
    return NextResponse.json({ error: 'actor is required.' }, { status: 400 });
  }

  const caseRecord = await prisma.case.findUnique({ where: { id } });
  if (!caseRecord) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }

  if (action === 'resolve') {
    const updated = await prisma.case.update({
      where: { id },
      data: {
        status: 'RESOLVED',
        events: {
          create: [{ action: 'RESOLVED', actor, note: note || 'Case resolved.' }],
        },
      },
      include: { events: { orderBy: { timestamp: 'asc' } } },
    });
    return NextResponse.json(updated);
  }

  // escalate
  const nextLevel = NEXT_LEVEL[caseRecord.level];
  if (!nextLevel) {
    return NextResponse.json({ error: 'Case is already at the highest level (CRO).' }, { status: 409 });
  }

  const deadlineAt = new Date(Date.now() + NEXT_DEADLINE_HOURS[nextLevel] * 60 * 60 * 1000);

  const updated = await prisma.case.update({
    where: { id },
    data: {
      level: nextLevel,
      status: 'OPEN',
      deadlineAt,
      events: {
        create: [
          {
            action: 'ESCALATED',
            actor,
            note: note || `Escalated to ${nextLevel.replace('_', ' ')} — ${NEXT_DEADLINE_HOURS[nextLevel]}h deadline.`,
          },
        ],
      },
    },
    include: { events: { orderBy: { timestamp: 'asc' } } },
  });

  return NextResponse.json(updated);
}
