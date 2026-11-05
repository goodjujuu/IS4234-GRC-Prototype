import { NextResponse } from 'next/server';
import { changeImpact, loadConfig, notifyRole, raiseWatcherAlert, tick } from '@/lib/engine';
import { appendLogEntry } from '@/lib/hashChain';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Threshold Governance. Only the conduct risk team can propose a change, and the Chief
// Risk Officer must approve it. Branch managers and team leads cannot make changes at all,
// so their attempt is blocked and logged. Every attempt alerts internal audit.
export async function POST(request) {
  const { user, error } = await apiUser(['TEAM_LEAD', 'CONDUCT_RISK']);
  if (error) return error;
  const { configKey, newValue, reason = '' } = await request.json();

  const row = await prisma.scoringConfig.findUnique({ where: { key: configKey } });
  if (!row) return NextResponse.json({ error: 'Choose a setting.' }, { status: 400 });
  const value = Number(newValue);
  if (!Number.isFinite(value) || value < 0) return NextResponse.json({ error: 'Enter a valid number.' }, { status: 400 });
  if (value === row.value) return NextResponse.json({ error: 'That is already the current value.' }, { status: 400 });
  if (reason.trim().length < 10) return NextResponse.json({ error: 'Give a reason of at least 10 characters.' }, { status: 400 });

  const now = await tick(prisma);
  const config = await loadConfig(prisma);
  const { flagged: flagsBefore, weakened } = await changeImpact(prisma, config, { ...config, [configKey]: value }, now);
  const blocked = user.role === 'TEAM_LEAD';
  await prisma.thresholdChangeRequest.create({
    data: {
      configKey, oldValue: row.value, newValue: value, reason: reason.trim(), requestedBy: user.name, requesterRole: user.role,
      flagsBefore, flagsAfter: flagsBefore - weakened, status: blocked ? 'BLOCKED' : 'PENDING', createdAt: now,
    },
  });
  await appendLogEntry(prisma, {
    event: blocked ? 'BLOCKED' : 'PROPOSED',
    change: `${row.label} from ${row.value} to ${value} ${blocked ? 'blocked. Branch managers and team leads cannot change thresholds.' : 'proposed.'} ${reason.trim()}`,
    changedBy: user.name,
    createdAt: now,
  });
  const impact = weakened > 0 ? `This would have weakened ${weakened} of today's ${flagsBefore} flags.` : "This would not weaken any of today's flags.";
  await raiseWatcherAlert(prisma, {
    type: 'THRESHOLD_CHANGE',
    severity: blocked || weakened > 0 ? 'HIGH' : 'MEDIUM',
    title: blocked ? `Branch manager tried to change ${row.label.toLowerCase()}` : `Change proposed to ${row.label.toLowerCase()}`,
    detail: `${user.name} (${user.title}) ${blocked ? 'tried to raise or change' : 'proposed changing'} ${row.label.toLowerCase()} from ${row.value} to ${value}. ${impact} The value has not changed.`,
    createdAt: now,
  });

  if (blocked) {
    return NextResponse.json({ message: `Blocked. Branch managers and team leads cannot change thresholds, so ${row.label.toLowerCase()} stays at ${row.value}. The attempt was written to the permanent log and internal audit was alerted.` });
  }
  await notifyRole(prisma, 'CHIEF_RISK_OFFICER', { title: 'Threshold change awaiting your approval', body: `${row.label}, proposed by ${user.name}.`, link: '/thresholds', createdAt: now });
  return NextResponse.json({ message: `Proposed. ${row.label} stays at ${row.value} until the Chief Risk Officer approves it. The proposal was logged and internal audit was alerted.` });
}
