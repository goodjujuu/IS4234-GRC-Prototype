import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SIGN_OFF_ROLES, isEffectivelyOff } from '@/lib/governance';
import { appendLogEntry } from '@/lib/hashChain';
import { formatValue, thresholdDef } from '@/lib/thresholds';

// M7 — sign off (the "checker"). Rules enforced here, not just in the UI:
//   - only second-line officers can approve or reject
//   - nobody can sign off their own request (maker-checker)
//   - a change that hides current flags needs a written justification
//   - switching a check off entirely needs the Chief Risk Officer
// Every decision is appended to the hash-chained control log.
export async function POST(request, { params }) {
  const { id } = await params;
  const { action, reviewer, note = '' } = await request.json();

  if (!['approve', 'reject'].includes(action)) return NextResponse.json({ error: 'action must be approve or reject.' }, { status: 400 });

  const req = await prisma.thresholdChangeRequest.findUnique({ where: { id } });
  if (!req) return NextResponse.json({ error: 'Request not found.' }, { status: 404 });
  if (req.status !== 'PENDING') return NextResponse.json({ error: 'This request has already been decided.' }, { status: 409 });

  if (!SIGN_OFF_ROLES.includes(reviewer)) {
    return NextResponse.json(
      { error: `${reviewer} cannot sign off threshold changes. Only the Second-Line Risk Officer or the Chief Risk Officer can.` },
      { status: 403 },
    );
  }
  if (reviewer === req.requestedBy) {
    return NextResponse.json({ error: 'Maker-checker: you cannot sign off a change you requested yourself.' }, { status: 403 });
  }

  const def = thresholdDef(req.thresholdKey);
  const from = formatValue(def.unit, req.oldValue);
  const to = formatValue(def.unit, req.newValue);
  const hides = req.flagsBefore - req.flagsAfter;

  if (action === 'approve') {
    if (hides > 0 && note.trim().length < 10) {
      return NextResponse.json(
        { error: `Suppression check: this change would hide ${hides} current flag${hides === 1 ? '' : 's'}. Write a justification (10+ characters) to approve it.` },
        { status: 422 },
      );
    }
    if (isEffectivelyOff(def.unit, req.newValue) && reviewer !== 'Chief Risk Officer') {
      return NextResponse.json({ error: 'This value switches the check off entirely, so only the Chief Risk Officer can approve it.' }, { status: 403 });
    }
    await prisma.threshold.update({ where: { key: req.thresholdKey }, data: { value: req.newValue } });
  }

  const updated = await prisma.thresholdChangeRequest.update({
    where: { id },
    data: { status: action === 'approve' ? 'APPROVED' : 'REJECTED', reviewedBy: reviewer, reviewNote: note || null, reviewedAt: new Date() },
  });

  await appendLogEntry(prisma, {
    change:
      action === 'approve'
        ? `${def.label}: threshold changed from ${from} to ${to}. Reason: ${req.reason}${hides > 0 ? ` (hides ${hides} current flag${hides === 1 ? '' : 's'}; justification: ${note})` : ''}`
        : `REJECTED — ${def.label}: proposed change from ${from} to ${to}. Reason given: ${req.reason}${note ? `. Reviewer: ${note}` : ''}`,
    changedBy: req.requestedBy,
    signedOffBy: reviewer,
  });

  return NextResponse.json(updated);
}
