import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidMobile, normaliseMobile } from '@/lib/contactRules';

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
  const { customerName, branchId, bankerId, product, mobile } = body;

  if (!customerName || !branchId || !bankerId) {
    return NextResponse.json(
      { error: 'customerName, branchId and bankerId are required.' },
      { status: 400 },
    );
  }

  // The customer's registered mobile (used for M2 consent and M1 notifications).
  // The demo form doesn't ask for one, so generate an unused synthetic number.
  let registeredMobile = mobile ? normaliseMobile(mobile) : null;
  if (registeredMobile && !isValidMobile(registeredMobile)) {
    return NextResponse.json({ error: 'mobile must be an 8-digit number starting with 8 or 9.' }, { status: 400 });
  }
  for (let i = 0; !registeredMobile && i < 10; i++) {
    const candidate = `9${String(Math.floor(Math.random() * 1e7)).padStart(7, '0')}`;
    const taken = await prisma.account.count({ where: { mobile: candidate } });
    if (!taken) registeredMobile = candidate;
  }
  const channel = registeredMobile ? 'SMS' : 'DUAL_STAFF'; // no phone on file -> dual staff verification

  const account = await prisma.account.create({
    data: {
      customerName,
      product: product || 'Savings Account',
      branchId,
      bankerId,
      mobile: registeredMobile,
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
