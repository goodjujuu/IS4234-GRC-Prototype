import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M1 — staff can never view or choose a customer's PIN. They can only send a
// secure setup link; the customer sets the PIN themselves on their own phone.
// The PIN is never sent to or stored by this app — only the fact that the
// customer set it. (A real system would store a salted hash in the card system.)
export async function POST(request, { params }) {
  const { id } = await params;
  const { action } = await request.json(); // 'send-link' | 'customer-set'

  const account = await prisma.account.findUnique({ where: { id } });
  if (!account) {
    return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
  }

  if (action === 'send-link') {
    const updated = await prisma.account.update({ where: { id }, data: { pinStatus: 'LINK_SENT' } });
    return NextResponse.json(updated);
  }

  if (action === 'customer-set') {
    if (account.pinStatus !== 'LINK_SENT') {
      return NextResponse.json({ error: 'No PIN setup link is active for this account.' }, { status: 409 });
    }
    const updated = await prisma.account.update({
      where: { id },
      data: { pinStatus: 'SET_BY_CUSTOMER', pinSetAt: new Date() },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'action must be send-link or customer-set.' }, { status: 400 });
}
