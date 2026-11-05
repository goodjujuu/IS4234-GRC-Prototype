import { NextResponse } from 'next/server';
import { recordDismissal, tick } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Stands in for the HR system's feed. A sales-misconduct dismissal opens a branch and
// manager review automatically and checks the retaliation guard.
export async function POST(request) {
  const { error } = await apiUser(['CONDUCT_RISK', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const { employeeId, reason = '' } = await request.json();
  if (reason.trim().length < 5) return NextResponse.json({ error: 'Give the dismissal reason.' }, { status: 400 });
  const employee = await prisma.employee.findUnique({ where: { id: employeeId } });
  if (!employee || employee.isManager) return NextResponse.json({ error: 'Choose an employee.' }, { status: 400 });
  if (employee.status !== 'ACTIVE') return NextResponse.json({ error: 'That employee has already left.' }, { status: 409 });

  const now = await tick(prisma);
  const { review, guard } = await recordDismissal(prisma, { employee, reason: reason.trim(), now });
  return NextResponse.json({
    message: `${review.ref} opened to review the branch and its manager.${guard ? ` The retaliation guard also fired and opened ${guard.ref} for the audit committee.` : ''}`,
  });
}
