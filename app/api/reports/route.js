import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { REPORT_THEMES } from '@/lib/format';

export const dynamic = 'force-dynamic';

// M5 — Speak-Up Channel. Reports are routed straight to second-line Risk and
// the Audit Committee; business-line management never sees them. Named
// reporters' identities are only visible to those recipients.
export async function GET() {
  const reports = await prisma.report.findMany({
    include: { branch: true, reporter: true },
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json(reports);
}

function trackingCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return `SU-${Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
}

export async function POST(request) {
  const { theme, description, branchId, anonymous = true, reporterId } = await request.json();
  if (!REPORT_THEMES[theme]) return NextResponse.json({ error: 'Choose what the report is about.' }, { status: 400 });
  if (!description || description.trim().length < 10) {
    return NextResponse.json({ error: 'Please describe what happened (at least 10 characters).' }, { status: 400 });
  }

  const report = await prisma.report.create({
    data: {
      theme,
      description: description.trim(),
      branchId: branchId || null,
      anonymous: Boolean(anonymous),
      reporterId: anonymous ? null : reporterId || null,
      trackingCode: trackingCode(),
    },
    include: { branch: true, reporter: true },
  });

  // A report about retaliation is itself a high-priority conduct alert.
  if (theme === 'RETALIATION') {
    await prisma.conductAlert.create({
      data: {
        type: 'RETALIATION_FLAGGED',
        severity: 'HIGH',
        source: 'M5',
        description: `Speak-up report ${report.trackingCode} alleges retaliation for raising a concern${report.branch ? ` at ${report.branch.name}` : ''}. Routed to the Audit Committee, bypassing branch management.`,
        branchId: report.branchId,
        status: 'OPEN',
      },
    });
  }

  return NextResponse.json(report, { status: 201 });
}
