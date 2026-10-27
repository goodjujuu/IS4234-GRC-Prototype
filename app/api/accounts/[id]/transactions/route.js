import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M3 — account activity.
// Customer-initiated activity (from the customer's own banking app) counts as
// genuine use. STAFF_FUND_AND_REVERSE simulates the Wells Fargo trick of a
// banker moving money into a new account and back out to make it look used —
// recorded as staff-initiated, so it never earns the incentive.
const CUSTOMER_KINDS = {
  CARD_PAYMENT: { amountCents: -680, description: 'Kopi Corner — card payment' },
  SALARY_CREDIT: { amountCents: 320000, description: 'Salary — Northpoint Pte Ltd' },
  BILL_PAYMENT: { amountCents: -8450, description: 'SP Utilities — bill payment' },
};

export async function POST(request, { params }) {
  const { id } = await params;
  const { kind } = await request.json();

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  if (account.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Only active accounts can be used.' }, { status: 409 });
  }

  if (CUSTOMER_KINDS[kind]) {
    const txn = await prisma.transaction.create({
      data: { accountId: id, kind, initiatedBy: 'CUSTOMER', ...CUSTOMER_KINDS[kind] },
    });
    await prisma.account.update({ where: { id }, data: { lastUsedAt: new Date() } });
    return NextResponse.json({ created: [txn] }, { status: 201 });
  }

  if (kind === 'STAFF_FUND_AND_REVERSE') {
    const now = Date.now();
    const created = await prisma.$transaction([
      prisma.transaction.create({
        data: {
          accountId: id, kind: 'STAFF_TRANSFER_IN', amountCents: 5000, initiatedBy: 'STAFF',
          description: 'Branch transfer — initial funding', createdAt: new Date(now - 1000),
        },
      }),
      prisma.transaction.create({
        data: {
          accountId: id, kind: 'STAFF_REVERSAL', amountCents: -5000, initiatedBy: 'STAFF',
          description: 'Reversal — initial funding', createdAt: new Date(now),
        },
      }),
    ]);
    return NextResponse.json({ created }, { status: 201 });
  }

  return NextResponse.json({ error: 'Unknown transaction kind.' }, { status: 400 });
}
