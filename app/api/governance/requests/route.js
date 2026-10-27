import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeRiskMap } from '@/lib/analytics';
import { PERSONAS } from '@/lib/governance';
import { thresholdDef } from '@/lib/thresholds';

// M7 — propose a threshold change (the "maker"). Nothing changes until an
// independent second-line officer signs it off. The suppression check counts
// how many of today's M4 breaches would disappear under the new value.
export async function POST(request) {
  const { thresholdKey, newValue, reason, requestedBy } = await request.json();
  const def = thresholdDef(thresholdKey);
  const value = Number(newValue);

  if (!def) return NextResponse.json({ error: 'Unknown threshold.' }, { status: 400 });
  if (!PERSONAS.some((p) => p.name === requestedBy)) return NextResponse.json({ error: 'Choose who is requesting.' }, { status: 400 });
  if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Enter a valid number.' }, { status: 400 });
  if (!reason || reason.trim().length < 5) return NextResponse.json({ error: 'Give a reason for the change.' }, { status: 400 });

  const pending = await prisma.thresholdChangeRequest.findFirst({ where: { thresholdKey, status: 'PENDING' } });
  if (pending) return NextResponse.json({ error: 'A change to this threshold is already awaiting sign-off.' }, { status: 409 });

  const current = await prisma.threshold.findUnique({ where: { key: thresholdKey } });
  const oldValue = current ? current.value : def.value;
  if (value === oldValue) return NextResponse.json({ error: 'That is already the current value.' }, { status: 400 });

  const [before, after] = await Promise.all([computeRiskMap(prisma), computeRiskMap(prisma, { [thresholdKey]: value })]);

  const created = await prisma.thresholdChangeRequest.create({
    data: {
      thresholdKey,
      oldValue,
      newValue: value,
      reason: reason.trim(),
      requestedBy,
      flagsBefore: before.totalBreaches,
      flagsAfter: after.totalBreaches,
    },
  });
  return NextResponse.json(created, { status: 201 });
}
