import { NextResponse } from 'next/server';
import { buildBriefingFacts, simulatedSummary } from '@/lib/briefing';
import { getNow, loadConfig, pressureAt, runScoring, sweepOverdue } from '@/lib/engine';
import { prisma } from '@/lib/prisma';
import { apiUser } from '@/lib/session';

// Presenter-only shortcuts. They stand in for the scheduler and for time passing, and
// run the same engine as real operation. `npm run seed` restores the starting state.
export async function POST(request) {
  const { error } = await apiUser(['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE']);
  if (error) return error;
  const { action, hours } = await request.json();
  const now = await getNow(prisma);

  if (action === 'advance') {
    const shift = Math.max(1, Math.min(24 * 14, Number(hours) || 0));
    const next = new Date(now.getTime() + shift * 3600000);
    await prisma.demoClock.update({ where: { id: 1 }, data: { now: next } });
    const escalated = await sweepOverdue(prisma, { now: next });
    return NextResponse.json({ message: `Clock moved forward ${shift} hours. ${escalated} overdue case${escalated === 1 ? '' : 's'} auto-escalated.` });
  }

  if (action === 'load') {
    const next = new Date(now.getTime() + 24 * 3600000);
    await prisma.demoClock.update({ where: { id: 1 }, data: { now: next } });
    const { table, opened, pressure, config } = await runScoring(prisma, { now: next });
    const escalated = await sweepOverdue(prisma, { now: next });
    const previousPressure = await pressureAt(prisma, new Date(next.getTime() - 24 * 3600000), config);
    const facts = await buildBriefingFacts(prisma, { now: next, pressure, previousPressure });
    const draft = simulatedSummary(facts);
    await prisma.briefing.create({ data: { asOf: next, facts, draft, summary: draft, source: 'SIMULATED', createdAt: next } });
    return NextResponse.json({ message: `Daily load done. ${table.length} employees scored, ${opened.length} new flags, ${escalated} escalated, and a new briefing is ready.` });
  }

  if (action === 'tamper-log') {
    const entry = await prisma.configChangeLog.findFirst({ where: { event: 'REJECTED' }, orderBy: { seq: 'asc' } });
    if (!entry) return NextResponse.json({ error: 'No rejected entry to edit.' }, { status: 404 });
    await prisma.configChangeLog.update({ where: { id: entry.id }, data: { change: entry.change.replace('rejected', 'approved') } });
    return NextResponse.json({ message: `Edited entry ${entry.seq} directly in the database, as a dishonest administrator might. Now run the chain check.` });
  }

  if (action === 'tamper-config') {
    const config = await loadConfig(prisma);
    await prisma.scoringConfig.update({ where: { key: 'level_high' }, data: { value: config.level_high + 15 } });
    return NextResponse.json({ message: 'Raised the High threshold directly in the database, bypassing approval. The effectiveness page now counts it as an unapproved change, and the next check alerts internal audit.' });
  }

  return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
}
