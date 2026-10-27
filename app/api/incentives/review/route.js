import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runUsageReview } from '@/lib/incentives';

// M3 — run the usage review. `fastForwardDays` lets the demo evaluate an
// account as if that many days had passed (e.g. 90 to reach the deadline);
// `accountId` limits the review to that one account.
export async function POST(request) {
  const { fastForwardDays = 0, accountId } = await request.json().catch(() => ({}));
  const days = Math.max(0, Math.min(400, Number(fastForwardDays) || 0));
  const asOf = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  const outcomes = await runUsageReview(prisma, { asOf, accountId: accountId || undefined });
  return NextResponse.json({ asOf, outcomes });
}
