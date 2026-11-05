import { NextResponse } from 'next/server';
import { notifyRole, tick } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// If an employee disagrees with the outcome of a case, they can appeal to the audit committee.
export async function POST(request) {
  const { user, error } = await apiUser(['EMPLOYEE']);
  if (error) return error;
  const { caseId, statement = '', evidence = '' } = await request.json();
  if (statement.trim().length < 10) return NextResponse.json({ error: 'Explain the appeal in at least 10 characters.' }, { status: 400 });

  const c = await prisma.case.findUnique({ where: { id: caseId }, include: { disputes: true } });
  if (!c || c.employeeId !== user.employeeId) return NextResponse.json({ error: 'You can only appeal a case on your own record.' }, { status: 403 });
  if (c.status !== 'CLOSED') return NextResponse.json({ error: 'You can appeal once the case has an outcome.' }, { status: 409 });
  if (c.outcome === 'CLEARED') return NextResponse.json({ error: 'This case was cleared, so there is nothing to appeal.' }, { status: 409 });
  if (c.disputes.some((d) => d.type === 'APPEAL')) return NextResponse.json({ error: 'You have already appealed this case.' }, { status: 409 });

  const now = await tick(prisma);
  await prisma.dispute.create({ data: { caseId, employeeId: user.employeeId, type: 'APPEAL', statement: statement.trim(), evidence: evidence.trim() || null, createdAt: now } });
  await prisma.case.update({
    where: { id: caseId },
    data: { inCommitteeSummary: true, events: { create: [{ action: 'APPEALED', actor: user.name, note: statement.trim(), timestamp: now }] } },
  });
  await notifyRole(prisma, 'AUDIT_COMMITTEE', { title: `Appeal received on ${c.ref}`, body: `${user.name} appealed the outcome of ${c.ref}.`, link: '/disputes', createdAt: now });
  return NextResponse.json({ message: 'Your appeal went to the audit committee. You can track it on this page.' });
}
