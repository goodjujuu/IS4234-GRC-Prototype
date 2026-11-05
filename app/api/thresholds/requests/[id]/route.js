import { NextResponse } from 'next/server';
import { raiseWatcherAlert, runScoring, tick } from '@/lib/engine';
import { appendLogEntry } from '@/lib/hashChain';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// The Chief Risk Officer decides proposals. Enforced here, not just in the UI:
//   - nobody else can decide, and nobody can decide their own proposal
//   - approving a change that weakens current flags needs a written justification
export async function POST(request, { params }) {
  const { id } = await params;
  const { user, error } = await apiUser(['TEAM_LEAD', 'CONDUCT_RISK', 'CHIEF_RISK_OFFICER']);
  if (error) return error;
  if (user.role !== 'CHIEF_RISK_OFFICER') return NextResponse.json({ error: 'Only the Chief Risk Officer can decide threshold changes.' }, { status: 403 });
  const { action, note = '' } = await request.json();
  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });

  const req = await prisma.thresholdChangeRequest.findUnique({ where: { id } });
  if (!req) return NextResponse.json({ error: 'Proposal not found.' }, { status: 404 });
  if (req.status !== 'PENDING') return NextResponse.json({ error: 'This proposal has already been decided.' }, { status: 409 });
  if (req.requestedBy === user.name) return NextResponse.json({ error: 'No one can approve their own proposal.' }, { status: 403 });

  const hides = req.flagsBefore - req.flagsAfter;
  if (action === 'approve' && hides > 0 && note.trim().length < 10) {
    return NextResponse.json({ error: `This change would weaken ${hides} of today's flags. Write a justification of at least 10 characters to approve it.` }, { status: 422 });
  }

  const now = await tick(prisma);
  const row = await prisma.scoringConfig.findUnique({ where: { key: req.configKey } });
  const approved = action === 'approve';
  await prisma.thresholdChangeRequest.update({
    where: { id },
    data: { status: approved ? 'APPROVED' : 'REJECTED', reviewedBy: user.name, reviewNote: note.trim() || null, reviewedAt: now },
  });
  if (approved) await prisma.scoringConfig.update({ where: { key: req.configKey }, data: { value: req.newValue } });
  await appendLogEntry(prisma, {
    event: approved ? 'APPROVED' : 'REJECTED',
    change: `${row.label} from ${req.oldValue} to ${req.newValue} ${approved ? 'approved' : 'rejected'}. ${note.trim()}`.trim(),
    changedBy: req.requestedBy,
    signedOffBy: user.name,
    createdAt: now,
  });
  await raiseWatcherAlert(prisma, {
    type: 'THRESHOLD_CHANGE',
    severity: approved && hides > 0 ? 'HIGH' : 'MEDIUM',
    title: `Change to ${row.label.toLowerCase()} ${approved ? 'approved' : 'rejected'}`,
    detail: `${user.name} ${approved ? 'approved' : 'rejected'} ${req.requestedBy}'s proposal to move ${row.label.toLowerCase()} from ${req.oldValue} to ${req.newValue}.${note.trim() ? ` ${note.trim()}` : ''}`,
    createdAt: now,
  });

  // An approved change takes effect straight away, so scores are recalculated.
  if (approved) await runScoring(prisma, { now });
  return NextResponse.json({ message: approved ? 'Approved, logged, and scores recalculated. Internal audit was alerted.' : 'Rejected and logged. The value did not change. Internal audit was alerted.' });
}
