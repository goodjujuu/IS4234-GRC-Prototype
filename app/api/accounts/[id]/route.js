import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Single account with its M1 contact-change history (newest first).
export async function GET(request, { params }) {
  const { id } = await params;
  const account = await prisma.account.findUnique({
    where: { id },
    include: {
      branch: true,
      banker: true,
      contactChanges: { include: { banker: true }, orderBy: { createdAt: 'desc' } },
    },
  });
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }
  return NextResponse.json(account);
}
