import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeRiskMap } from '@/lib/analytics';

export const dynamic = 'force-dynamic';

// M4 — current banker / branch risk map against the governed thresholds.
export async function GET() {
  const [map, lastRun] = await Promise.all([
    computeRiskMap(prisma),
    prisma.analyticsRun.findFirst({ orderBy: { createdAt: 'desc' } }),
  ]);
  return NextResponse.json({ ...map, lastRun });
}
