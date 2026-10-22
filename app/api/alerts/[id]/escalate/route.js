import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M6 — Escalation & Case Management: first escalation hop, branch-level,
// with a 5-day deadline per the tiered SLA (Branch 5d -> Conduct Office 48h
// -> CRO 24h). Every action is time-stamped into an audit trail (CaseEvent).
const BRANCH_DEADLINE_DAYS = 5;

export async function POST(request, { params }) {
  const { id } = params;

  const alert = await prisma.conductAlert.findUnique({
    where: { id },
    include: { caseRecord: true },
  });

  if (!alert) {
    return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
  }
  if (alert.caseRecord) {
    return NextResponse.json({ error: 'Alert already escalated to a case.' }, { status: 409 });
  }

  const deadlineAt = new Date(Date.now() + BRANCH_DEADLINE_DAYS * 24 * 60 * 60 * 1000);

  const caseRecord = await prisma.case.create({
    data: {
      alertId: alert.id,
      branchId: alert.branchId,
      bankerId: alert.bankerId,
      level: 'BRANCH',
      status: 'OPEN',
      deadlineAt,
      events: {
        create: [
          {
            action: 'OPENED',
            actor: 'Branch Manager',
            note: `Escalated from conduct alert (${alert.type}). Branch has ${BRANCH_DEADLINE_DAYS} days to respond.`,
          },
        ],
      },
    },
    include: { events: true },
  });

  await prisma.conductAlert.update({
    where: { id },
    data: { status: 'ESCALATED' },
  });

  return NextResponse.json(caseRecord, { status: 201 });
}
