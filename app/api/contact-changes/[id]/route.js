import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { fieldLabel } from '@/lib/contactRules';

// M1 — resolve a contact change that is in its 48-hour cooling-off period.
//   confirm               customer replied YES on their existing mobile → apply now
//   cancel                customer replied NO → cancel, and log a conduct alert
//   cooling-off-elapsed   no reply within 48 hours → apply (demo: presenter fast-forward)
const OUTCOMES = {
  confirm: 'CONFIRMED_BY_CUSTOMER',
  cancel: 'CANCELLED_BY_CUSTOMER',
  'cooling-off-elapsed': 'APPLIED_AFTER_COOLING_OFF',
};

export async function POST(request, { params }) {
  const { id } = await params;
  const { action } = await request.json();

  if (!OUTCOMES[action]) {
    return NextResponse.json({ error: 'action must be confirm, cancel or cooling-off-elapsed.' }, { status: 400 });
  }

  const changeRequest = await prisma.contactChangeRequest.findUnique({
    where: { id },
    include: { account: true, banker: true },
  });
  if (!changeRequest) {
    return NextResponse.json({ error: 'Contact change not found.' }, { status: 404 });
  }
  if (changeRequest.status !== 'PENDING_COOLING_OFF') {
    return NextResponse.json({ error: 'This contact change has already been resolved.' }, { status: 409 });
  }

  const updated = await prisma.contactChangeRequest.update({
    where: { id },
    data: { status: OUTCOMES[action], resolvedAt: new Date() },
  });

  if (action === 'cancel') {
    await prisma.conductAlert.create({
      data: {
        type: 'CONTACT_CHANGE_DISPUTED',
        severity: 'HIGH',
        source: 'M1',
        description:
          `${changeRequest.account.customerName} replied NO to a ${fieldLabel(changeRequest.field)} change requested by ` +
          `${changeRequest.banker.name}. Cancelled during the 48-hour cooling-off period.`,
        branchId: changeRequest.banker.branchId,
        bankerId: changeRequest.bankerId,
        accountId: changeRequest.accountId,
        status: 'OPEN',
      },
    });
  } else {
    await prisma.account.update({
      where: { id: changeRequest.accountId },
      data: changeRequest.field === 'MOBILE' ? { mobile: changeRequest.newValue } : { email: changeRequest.newValue },
    });
  }

  return NextResponse.json(updated);
}
