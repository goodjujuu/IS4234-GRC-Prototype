import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Resolves the M2 consent step: customer approves/declines on their own
// registered channel, or the request expires after no reply. A decline or
// expiry blocks the account and is logged against the banker and branch —
// this is the "no" branch out of M2 in the module flow.
export async function POST(request, { params }) {
  const { id } = params;
  const body = await request.json();
  const { action } = body; // 'approve' | 'decline' | 'expire'

  if (!['approve', 'decline', 'expire'].includes(action)) {
    return NextResponse.json({ error: 'action must be approve, decline or expire.' }, { status: 400 });
  }

  const account = await prisma.account.findUnique({
    where: { id },
    include: { consentRequest: true },
  });

  if (!account || !account.consentRequest) {
    return NextResponse.json({ error: 'Account or consent request not found.' }, { status: 404 });
  }

  if (action === 'approve') {
    await prisma.consentRequest.update({
      where: { accountId: id },
      data: { status: 'APPROVED', respondedAt: new Date() },
    });
    const updated = await prisma.account.update({
      where: { id },
      data: { status: 'ACTIVE', activatedAt: new Date() },
      include: { branch: true, banker: true, consentRequest: true },
    });
    return NextResponse.json(updated);
  }

  // decline or expire: block the account and log an M2 conduct alert.
  const newConsentStatus = action === 'decline' ? 'DECLINED' : 'EXPIRED';
  await prisma.consentRequest.update({
    where: { accountId: id },
    data: { status: newConsentStatus, respondedAt: new Date() },
  });

  const updated = await prisma.account.update({
    where: { id },
    data: { status: newConsentStatus },
    include: { branch: true, banker: true, consentRequest: true },
  });

  await prisma.conductAlert.create({
    data: {
      type: action === 'decline' ? 'CONSENT_DECLINED' : 'CONSENT_EXPIRED',
      severity: 'MEDIUM',
      source: 'M2',
      description: `Account for ${account.customerName} was ${newConsentStatus.toLowerCase()} at the consent gate — blocked, logged against banker and branch.`,
      branchId: account.branchId,
      bankerId: account.bankerId,
      accountId: account.id,
      status: 'OPEN',
    },
  });

  return NextResponse.json(updated);
}
