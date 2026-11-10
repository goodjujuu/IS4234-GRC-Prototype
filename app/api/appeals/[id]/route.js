import { NextResponse } from 'next/server';
import { notifyUser, tick } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// The audit committee decides appeals. An upheld appeal overturns the outcome, clears the
// case and counts as a false alarm.
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['AUDIT_COMMITTEE']);
  if (error) return error;
  const { action, note = '' } = await request.json();
  if (!['uphold', 'reject'].includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
  if (note.trim().length < 5) return NextResponse.json({ error: 'Record a short reason for the decision.' }, { status: 400 });

  const a = await prisma.dispute.findUnique({ where: { id }, include: { case: true, employee: { include: { user: true } } } });
  if (!a || a.type !== 'APPEAL') return NextResponse.json({ error: 'Appeal not found.' }, { status: 404 });
  if (a.status !== 'OPEN') return NextResponse.json({ error: 'This appeal has already been decided.' }, { status: 409 });

  const now = await tick(prisma);
  const trimmed = note.trim();
  const upheld = action === 'uphold';
  await prisma.dispute.update({ where: { id }, data: { status: upheld ? 'UPHELD' : 'REJECTED', decidedBy: user.name, decisionNote: trimmed, decidedAt: now } });
  await prisma.case.update({
    where: { id: a.caseId },
    data: {
      ...(upheld ? { outcome: 'CLEARED', closeReason: `Appeal upheld by the audit committee. ${trimmed}` } : {}),
      events: { create: [{ action: 'APPEAL_DECIDED', actor: user.name, note: `${upheld ? 'Upheld, outcome overturned and recorded as a false alarm' : 'Rejected, outcome stands'}. ${trimmed}`, timestamp: now }] },
    },
  });
  if (a.employee.user) await notifyUser(prisma, a.employee.user.id, { title: `Your appeal on ${a.case.ref} was ${upheld ? 'upheld' : 'rejected'}`, body: trimmed, link: '/me/disputes', createdAt: now });
  return NextResponse.json({ message: upheld ? 'Appeal upheld. The outcome was overturned.' : 'Appeal rejected. The outcome stands.' });
}
