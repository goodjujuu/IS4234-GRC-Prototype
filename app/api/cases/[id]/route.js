import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request, { params }) {
  const { id } = params;
  const caseRecord = await prisma.case.findUnique({
    where: { id },
    include: {
      alert: { include: { account: true } },
      branch: true,
      banker: true,
      events: { orderBy: { timestamp: 'asc' } },
    },
  });

  if (!caseRecord) {
    return NextResponse.json({ error: 'Case not found.' }, { status: 404 });
  }
  return NextResponse.json(caseRecord);
}
