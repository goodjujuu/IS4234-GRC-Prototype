import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// M4 — Conduct Analytics: the aggregated view across M1/M2/M3/M5 signals
// (blocked contact changes, declined consents, lapsed incentives,
// retaliation-flagged reports) plus branch-wide pattern detections.
export async function GET() {
  const alerts = await prisma.conductAlert.findMany({
    include: { branch: true, banker: true, account: true, caseRecord: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(alerts);
}
