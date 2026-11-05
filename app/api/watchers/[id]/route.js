import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  await prisma.watcherAlert.update({ where: { id }, data: { status: 'ACKNOWLEDGED', acknowledgedBy: user.name } });
  return NextResponse.json({ ok: true });
}
