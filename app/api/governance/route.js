import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { computeRiskMap } from '@/lib/analytics';
import { alertVolume, isEffectivelyOff } from '@/lib/governance';
import { verifyChain } from '@/lib/hashChain';

export const dynamic = 'force-dynamic';

const DAY = 24 * 60 * 60 * 1000;

// M7 — everything the control-governance page needs.
export async function GET() {
  const [map, requests, chain, lastRun, alerts, branches] = await Promise.all([
    computeRiskMap(prisma),
    prisma.thresholdChangeRequest.findMany({ orderBy: { createdAt: 'desc' } }),
    verifyChain(prisma),
    prisma.analyticsRun.findFirst({ orderBy: { createdAt: 'desc' } }),
    prisma.conductAlert.findMany({ select: { createdAt: true } }),
    prisma.branch.findMany({ include: { bankers: true, accounts: true }, orderBy: { name: 'asc' } }),
  ]);

  const runFresh = lastRun && Date.now() - new Date(lastRun.createdAt).getTime() < 7 * DAY;
  const coverage = {
    lastRun,
    runFresh: Boolean(runFresh),
    thresholds: map.thresholds.map((t) => ({ key: t.key, label: t.label, value: t.value, unit: t.unit, off: isEffectivelyOff(t.unit, t.value) })),
    branches: branches.map((b) => ({
      id: b.id,
      name: b.name,
      bankers: b.bankers.length,
      accounts: b.accounts.length,
      monitored: Boolean(runFresh),
    })),
  };

  return NextResponse.json({
    thresholds: map.thresholds,
    totalBreaches: map.totalBreaches,
    requests,
    chain,
    coverage,
    volume: alertVolume(alerts),
  });
}
