import { prisma } from '@/lib/prisma';
import { computeRiskMap } from '@/lib/analytics';
import { alertVolume } from '@/lib/governance';
import { verifyChain } from '@/lib/hashChain';

// Board Risk & Audit Committee conduct KRI pack.
// Aggregates every module into the metrics named in the group's report:
// consent-decline rate, unused-account rate, complaints, dismissals by reason,
// threshold changes and overdue alerts — plus the M7 integrity checks.
export async function getKriSummary() {
  const [consents, accounts, reports, alerts, cases, chain, thresholdRequests, incentiveEvents, map] = await Promise.all([
    prisma.consentRequest.findMany({ where: { status: { not: 'PENDING' } } }),
    prisma.account.findMany({ where: { status: 'ACTIVE' } }),
    prisma.report.findMany(),
    prisma.conductAlert.findMany(),
    prisma.case.findMany({ include: { events: true } }),
    verifyChain(prisma),
    prisma.thresholdChangeRequest.findMany(),
    prisma.incentiveEvent.findMany(),
    computeRiskMap(prisma),
  ]);

  const now = new Date();
  const declined = consents.filter((c) => ['DECLINED', 'EXPIRED'].includes(c.status)).length;
  const reviewed = accounts.filter((a) => ['PAID', 'LAPSED'].includes(a.incentiveStatus));
  const lapsed = reviewed.filter((a) => a.incentiveStatus === 'LAPSED').length;

  const openAlertsList = alerts.filter((a) => a.status === 'OPEN');
  const liveAlerts = alerts.filter((a) => a.status !== 'DISMISSED');
  const alertsBySource = ['M1', 'M2', 'M3', 'M4', 'M5', 'M7'].map((s) => ({
    source: s,
    count: liveAlerts.filter((a) => a.source === s).length,
  }));

  const dismissed = alerts.filter((a) => a.status === 'DISMISSED');
  const reasons = {};
  for (const a of dismissed) reasons[a.dismissReason || 'No reason'] = (reasons[a.dismissReason || 'No reason'] || 0) + 1;

  const sum = (kind) => incentiveEvents.filter((e) => e.kind === kind).reduce((n, e) => n + e.amount, 0);

  return {
    consentDeclineRate: consents.length ? declined / consents.length : 0,
    consentCounts: { declined, total: consents.length },
    unusedAccountRate: reviewed.length ? lapsed / reviewed.length : 0,
    unusedCounts: { lapsed, reviewed: reviewed.length },
    complaints: reports.length,
    retaliationFlags: reports.filter((r) => r.retaliationFlag).length,
    openAlerts: openAlertsList.length,
    highOpenAlerts: openAlertsList.filter((a) => a.severity === 'HIGH').length,
    alertsBySource,
    dismissalsByReason: Object.entries(reasons).map(([reason, count]) => ({ reason, count })),
    dismissedTotal: dismissed.length,
    overdueCases: cases.filter((c) => c.status !== 'RESOLVED' && c.deadlineAt < now).length,
    boardNotified: cases.filter((c) => c.events.some((e) => e.action === 'BOARD_NOTIFIED')).length,
    openCases: cases.filter((c) => c.status !== 'RESOLVED').length,
    resolvedCases: cases.filter((c) => c.status === 'RESOLVED').length,
    chain: { intact: chain.intact, firstBroken: chain.firstBroken, entries: chain.entries.length },
    configChanges: [...chain.entries].reverse().slice(0, 6),
    thresholdChanges: {
      approved: thresholdRequests.filter((r) => r.status === 'APPROVED').length,
      rejected: thresholdRequests.filter((r) => r.status === 'REJECTED').length,
      pending: thresholdRequests.filter((r) => r.status === 'PENDING').length,
      suppressing: thresholdRequests.filter((r) => r.flagsAfter < r.flagsBefore).length,
    },
    incentives: { paid: sum('PAID') + sum('RETENTION_BONUS'), lapsed: sum('LAPSED') },
    suppression: alertVolume(alerts, now.getTime()).suppressed,
    topBankers: map.bankers.filter((b) => b.riskScore > 0).slice(0, 3),
    thresholds: map.thresholds,
  };
}
