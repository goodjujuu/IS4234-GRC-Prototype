import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { COOLING_OFF_HOURS, checkContactChange, displayValue, fieldLabel } from '@/lib/contactRules';

// M1 — a banker asks to change a customer's mobile number or email.
// Breaking a rule blocks the change and logs a conduct alert against the
// banker and branch. Otherwise the change waits out a 48-hour cooling-off
// period, and the customer is told on their *existing* mobile so they can
// object before it takes effect.
export async function POST(request, { params }) {
  const { id } = await params;
  const { field, value, bankerId } = await request.json();

  if (!bankerId) {
    return NextResponse.json({ error: 'bankerId is required.' }, { status: 400 });
  }

  const [account, banker] = await Promise.all([
    prisma.account.findUnique({ where: { id } }),
    prisma.banker.findUnique({ where: { id: bankerId }, include: { branch: true } }),
  ]);
  if (!account || !banker) {
    return NextResponse.json({ error: 'Account or banker not found.' }, { status: 404 });
  }

  const pending = await prisma.contactChangeRequest.findFirst({
    where: { accountId: id, status: 'PENDING_COOLING_OFF' },
  });
  if (pending) {
    return NextResponse.json(
      { error: 'A contact change is already waiting out its cooling-off period for this customer.' },
      { status: 409 },
    );
  }

  const check = await checkContactChange(prisma, { account, field, value });
  if (check.error) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  const oldValue = field === 'MOBILE' ? account.mobile : account.email;

  if (check.blockReason) {
    const changeRequest = await prisma.contactChangeRequest.create({
      data: {
        accountId: id,
        bankerId,
        field,
        oldValue,
        newValue: check.normalised,
        status: 'BLOCKED',
        blockReason: check.blockReason,
        resolvedAt: new Date(),
      },
    });

    await prisma.conductAlert.create({
      data: {
        type: 'BLOCKED_CONTACT_CHANGE',
        severity: 'HIGH',
        source: 'M1',
        description:
          `${banker.name} tried to change ${account.customerName}'s ${fieldLabel(field)} to ` +
          `${displayValue(field, check.normalised)}. Blocked: ${check.blockReason} Customer notified on their existing mobile.`,
        branchId: banker.branchId,
        bankerId,
        accountId: id,
        status: 'OPEN',
      },
    });

    return NextResponse.json({ outcome: 'BLOCKED', changeRequest, branchName: banker.branch.name }, { status: 201 });
  }

  const changeRequest = await prisma.contactChangeRequest.create({
    data: {
      accountId: id,
      bankerId,
      field,
      oldValue,
      newValue: check.normalised,
      status: 'PENDING_COOLING_OFF',
      effectiveAt: new Date(Date.now() + COOLING_OFF_HOURS * 60 * 60 * 1000),
    },
  });

  return NextResponse.json({ outcome: 'PENDING', changeRequest, branchName: banker.branch.name }, { status: 201 });
}
