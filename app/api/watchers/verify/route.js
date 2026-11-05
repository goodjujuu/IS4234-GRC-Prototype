import { NextResponse } from 'next/server';
import { checkUnapprovedChanges, getNow, raiseWatcherAlert } from '@/lib/engine';
import { verifyChain } from '@/lib/hashChain';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Recomputes the whole chain and replays approved changes against live settings. Either
// kind of breach raises a warning sign for internal audit, once.
export async function POST() {
  const { error } = await apiUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const now = await getNow(prisma);
  const unapproved = await checkUnapprovedChanges(prisma, now);
  const chain = await verifyChain(prisma);
  if (!chain.intact) {
    const title = `Change log tampering detected at entry ${chain.firstBroken}`;
    if (!(await prisma.watcherAlert.findFirst({ where: { type: 'LOG_TAMPERING', title } }))) {
      await raiseWatcherAlert(prisma, {
        type: 'LOG_TAMPERING',
        severity: 'HIGH',
        title,
        detail: `Entry ${chain.firstBroken} no longer matches its hash, so the permanent log has been edited.`,
        createdAt: now,
      });
    }
    return NextResponse.json({ error: `Chain broken at entry ${chain.firstBroken}. A high severity alert went to internal audit.` }, { status: 409 });
  }
  if (unapproved.length) return NextResponse.json({ error: `The chain is intact, but ${unapproved.length} setting skipped approval. An alert went to internal audit.` }, { status: 409 });
  return NextResponse.json({ message: `All clear. The ${chain.entries.length} log entries match their hashes and every setting has approval.` });
}
