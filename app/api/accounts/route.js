import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// M2 — Independent Consent Gate starts here: opening an account creates a
// PENDING_CONSENT account plus a ConsentRequest that must be approved on the
// customer's own registered channel before the account can go ACTIVE.
export async function GET() {
  const accounts = await prisma.account.findMany({
    include: { branch: true, banker: true, consentRequest: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(accounts);
}

export async function POST(request) {
  const body = await request.json();
  const { customerName, branchId, bankerId, product } = body;

  if (!customerName || !branchId || !bankerId) {
    return NextResponse.json(
      { error: 'customerName, branchId and bankerId are required.' },
      { status: 400 },
    );
  }

  const hasPhoneOnFile = true; // demo: assume phone on file unless told otherwise
  const channel = hasPhoneOnFile ? 'SMS' : 'DUAL_STAFF';

  const account = await prisma.account.create({
    data: {
      customerName,
      product: product || 'Savings Account',
      branchId,
      bankerId,
      status: 'PENDING_CONSENT',
      incentiveStatus: 'PROVISIONAL',
      consentRequest: {
        create: { channel, status: 'PENDING' },
      },
    },
    include: { branch: true, banker: true, consentRequest: true },
  });

  return NextResponse.json(account, { status: 201 });
}
