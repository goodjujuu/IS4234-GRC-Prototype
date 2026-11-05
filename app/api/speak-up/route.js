import { randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { notifyRole, reporterSeal, tick } from '@/lib/engine';
import { REPORT_THEMES } from '@/lib/format';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Protected Speak-Up Link. The report stores no name or user id, only a one-way seal the
// retaliation guard can match. The report feeds the branch's Pressure Index.
export async function POST(request) {
  const { user, error } = await apiUser(['EMPLOYEE', 'TEAM_LEAD']);
  if (error) return error;
  const { theme, message = '' } = await request.json();
  if (!REPORT_THEMES[theme]) return NextResponse.json({ error: 'Choose a theme.' }, { status: 400 });
  if (message.trim().length < 10) return NextResponse.json({ error: 'Describe the concern in at least 10 characters.' }, { status: 400 });
  if (!user.employee) return NextResponse.json({ error: 'Only branch staff use this channel.' }, { status: 403 });

  const now = await tick(prisma);
  const trackingCode = `SU-${randomBytes(2).toString('hex').toUpperCase()}`;
  await prisma.speakUpReport.create({
    data: { trackingCode, theme, message: message.trim(), reporterSeal: reporterSeal(user.employee.id), branchId: user.employee.branchId, createdAt: now },
  });
  await notifyRole(prisma, 'CONDUCT_RISK', { title: 'New anonymous speak-up report', body: REPORT_THEMES[theme], link: '/speak-up/reports', createdAt: now });
  return NextResponse.json({ message: `Report received. Your tracking code is ${trackingCode}. Your name is not stored with it, and it now counts towards your branch's Pressure Index.` });
}
