import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { DISMISS_REASONS } from '@/lib/format';

// M4 — dismissing an alert needs a recorded reason and who did it. The Board
// sees dismissals broken down by reason, so alerts can't be quietly waved away.
export async function POST(request, { params }) {
  const { id } = await params;
  const { reason, by = 'Conduct Office Analyst' } = await request.json();

  if (!DISMISS_REASONS.includes(reason)) {
    return NextResponse.json({ error: 'Choose a dismissal reason.' }, { status: 400 });
  }
  const alert = await prisma.conductAlert.findUnique({ where: { id } });
  if (!alert) return NextResponse.json({ error: 'Alert not found.' }, { status: 404 });
  if (alert.status !== 'OPEN') return NextResponse.json({ error: 'Only open alerts can be dismissed.' }, { status: 409 });

  const updated = await prisma.conductAlert.update({
    where: { id },
    data: { status: 'DISMISSED', dismissReason: reason, dismissedBy: by, dismissedAt: new Date() },
  });
  return NextResponse.json(updated);
}
