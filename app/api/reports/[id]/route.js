import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// M5 — actions on a report.
//   review          second line marks it reviewed
//   adverse-action  demo: an HR system records an adverse action (cut hours)
//                   against the named reporter -> automatic retaliation flag
export async function POST(request, { params }) {
  const { id } = await params;
  const { action } = await request.json();

  const report = await prisma.report.findUnique({ where: { id }, include: { reporter: true, branch: true } });
  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });

  if (action === 'review') {
    const updated = await prisma.report.update({ where: { id }, data: { status: 'REVIEWED' } });
    return NextResponse.json(updated);
  }

  if (action === 'adverse-action') {
    if (report.anonymous || !report.reporter) {
      return NextResponse.json(
        { error: 'This reporter is anonymous — management has no way to identify or target them.' },
        { status: 409 },
      );
    }
    const note = `HR system: ${report.reporter.name}’s rostered hours were cut by 30% two weeks after filing report ${report.trackingCode}.`;
    const updated = await prisma.report.update({
      where: { id },
      data: { retaliationFlag: true, retaliationNote: note },
    });
    await prisma.conductAlert.create({
      data: {
        type: 'RETALIATION_FLAGGED',
        severity: 'HIGH',
        source: 'M5',
        description: `Possible retaliation: ${note} Routed to the Audit Committee, bypassing branch management.`,
        branchId: report.branchId,
        status: 'OPEN',
      },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
