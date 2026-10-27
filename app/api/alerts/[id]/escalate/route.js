import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M6 — Escalation & Case Management: open a case from a conduct alert.
// Tiered SLA: Branch 5 days -> Conduct Office 48h -> CRO 24h.
// Routing rules decide where the case starts:
//   - speak-up / retaliation alerts (M5) skip the branch, which may be implicated
//   - control-tampering alerts (M7) go straight to the CRO
//   - repeat pattern: a banker with another case in the last 180 days skips the branch
const HOURS = { BRANCH: 5 * 24, CONDUCT_OFFICE: 48, CRO: 24 };
const LEVEL_NAME = { BRANCH: 'the branch', CONDUCT_OFFICE: 'the Conduct Office', CRO: 'the Chief Risk Officer' };
const DAY = 24 * 60 * 60 * 1000;

export async function POST(request, { params }) {
  const { id } = await params;
  const { actor = 'Conduct Office Analyst' } = await request.json().catch(() => ({}));

  const alert = await prisma.conductAlert.findUnique({ where: { id }, include: { caseRecord: true } });
  if (!alert) return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
  if (alert.caseRecord) return NextResponse.json({ error: 'Alert already escalated to a case.' }, { status: 409 });
  if (alert.status === 'DISMISSED') return NextResponse.json({ error: 'Alert was dismissed.' }, { status: 409 });

  let level = 'BRANCH';
  let reason = 'Standard routing: the branch has the first 5 days to respond.';

  if (alert.source === 'M7') {
    level = 'CRO';
    reason = 'Control-tampering alerts go straight to the Chief Risk Officer.';
  } else if (alert.source === 'M5') {
    level = 'CONDUCT_OFFICE';
    reason = 'Speak-up and retaliation alerts bypass branch management, which may be implicated.';
  } else if (alert.bankerId) {
    const prior = await prisma.case.count({
      where: { bankerId: alert.bankerId, createdAt: { gte: new Date(Date.now() - 180 * DAY) } },
    });
    if (prior > 0) {
      level = 'CONDUCT_OFFICE';
      reason = `Repeat pattern: this banker already has ${prior} case${prior === 1 ? '' : 's'} in the last 180 days, so the branch level is skipped.`;
    }
  }

  const caseRecord = await prisma.case.create({
    data: {
      alertId: alert.id,
      branchId: alert.branchId,
      bankerId: alert.bankerId,
      level,
      status: 'OPEN',
      deadlineAt: new Date(Date.now() + HOURS[level] * 60 * 60 * 1000),
      events: {
        create: [{ action: 'OPENED', actor, note: `Case opened with ${LEVEL_NAME[level]}. ${reason}` }],
      },
    },
    include: { events: true },
  });

  await prisma.conductAlert.update({ where: { id }, data: { status: 'ESCALATED' } });
  return NextResponse.json(caseRecord, { status: 201 });
}
