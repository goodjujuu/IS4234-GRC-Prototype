import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const cases = await prisma.case.findMany({
    include: {
      alert: true,
      branch: true,
      banker: true,
      events: { orderBy: { timestamp: 'asc' } },
    },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(cases);
}
