import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  const branches = await prisma.branch.findMany({
    include: { bankers: true },
    orderBy: { name: 'asc' },
  });
  return NextResponse.json(branches);
}
