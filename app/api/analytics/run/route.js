import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { runAnalytics } from '@/lib/analytics';

// M4 — run the analytics engine now and raise pattern alerts.
export async function POST() {
  const { raised, run } = await runAnalytics(prisma);
  return NextResponse.json({ raised, run });
}
