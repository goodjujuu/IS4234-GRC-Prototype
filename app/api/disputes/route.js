import { NextResponse } from 'next/server';
import { canActOnCase } from '@/lib/access';
import { notifyUser, tick } from '@/lib/engine';
import { METRICS } from '@/lib/scoring';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// An employee disputes a flag on their own record, with supporting evidence. The reviewer
// must consider it before deciding the case.
export async function POST(request) {
  const { user, error } = await apiUser(['EMPLOYEE']);
  if (error) return error;
  const { caseId, metricKey, statement = '', evidence = '' } = await request.json();

  if (!METRICS.some((m) => m.key === metricKey)) return NextResponse.json({ error: 'Choose which metric you are disputing.' }, { status: 400 });
  if (statement.trim().length < 10) return NextResponse.json({ error: 'Explain the dispute in at least 10 characters.' }, { status: 400 });

  const c = await prisma.case.findUnique({ where: { id: caseId }, include: { disputes: true } });
  if (!c || c.employeeId !== user.employeeId) return NextResponse.json({ error: 'You can only dispute a flag on your own record.' }, { status: 403 });
  if (c.status === 'CLOSED') return NextResponse.json({ error: 'This case is closed. You can appeal the outcome instead.' }, { status: 409 });
  if (c.disputes.some((d) => d.status === 'OPEN')) return NextResponse.json({ error: 'You already have an open dispute on this case.' }, { status: 409 });

  const now = await tick(prisma);
  await prisma.dispute.create({ data: { caseId, employeeId: user.employeeId, metricKey, statement: statement.trim(), evidence: evidence.trim() || null, createdAt: now } });
  await prisma.caseEvent.create({ data: { caseId, action: 'DISPUTED', actor: user.name, note: statement.trim(), evidence: { metricKey, supporting: evidence.trim() || null }, timestamp: now } });

  const reviewers = await prisma.user.findMany({ where: c.tier === 'TEAM_LEAD' ? { role: 'TEAM_LEAD', branchId: c.branchId } : { role: c.tier } });
  for (const r of reviewers) {
    if (canActOnCase(r, c)) await notifyUser(prisma, r.id, { title: `Dispute received on ${c.ref}`, body: `${user.name} disputed a flag. Consider it before deciding the case.`, link: '/disputes', createdAt: now });
  }
  return NextResponse.json({ message: 'Your dispute was submitted. The reviewer must consider it before deciding, and you can track it on this page.' });
}
