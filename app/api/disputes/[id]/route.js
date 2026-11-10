import { NextResponse } from 'next/server';
import { canActOnCase } from '@/lib/access';
import { notifyUser, tick } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// The case's reviewer decides a dispute. An upheld dispute closes the case as cleared and
// is recorded as a false alarm. The employee can appeal any outcome to the audit committee.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const { action, note = '' } = await request.json();
  if (!['uphold', 'reject'].includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  if (note.trim().length < 5) return NextResponse.json({ error: 'Record a short reason for the decision.' }, { status: 400 });

  const d = await prisma.dispute.findUnique({ where: { id }, include: { case: true, employee: { include: { user: true } } } });
  if (!d || d.type !== 'DISPUTE') return NextResponse.json({ error: 'Dispute not found.' }, { status: 404 });
  if (d.status !== 'OPEN') return NextResponse.json({ error: 'This dispute has already been decided.' }, { status: 409 });
  if (!canActOnCase(user, d.case)) return NextResponse.json({ error: 'Only the reviewer this case is routed to can decide its dispute.' }, { status: 403 });

  const now = await tick(prisma);
  const trimmed = note.trim();
  const upheld = action === 'uphold';
  await prisma.dispute.update({ where: { id }, data: { status: upheld ? 'UPHELD' : 'REJECTED', decidedBy: user.name, decisionNote: trimmed, decidedAt: now } });
  await prisma.case.update({
    where: { id: d.caseId },
    data: {
      firstActionAt: d.case.firstActionAt || now,
      ...(upheld ? { status: 'CLOSED', outcome: 'CLEARED', closeReason: `Dispute upheld. ${trimmed}`, closedAt: now } : {}),
      events: { create: [{ action: 'DISPUTE_DECIDED', actor: user.name, note: `${upheld ? 'Upheld, recorded as a false alarm' : 'Rejected'}. ${trimmed}`, evidence: { metricKey: d.metricKey }, timestamp: now }] },
    },
  });
  if (d.employee.user) {
    await notifyUser(prisma, d.employee.user.id, { title: `Your dispute on ${d.case.ref} was ${upheld ? 'upheld' : 'rejected'}`, body: trimmed, link: '/me/disputes', createdAt: now });
  }
  return NextResponse.json({ message: upheld ? 'Dispute upheld. The case closed as cleared and counts as a false alarm.' : 'Dispute rejected. The case stays open until you record an outcome.' });
}
