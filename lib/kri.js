import { prisma } from '@/lib/prisma';

// Board Risk & Audit Committee conduct KRI dashboard (M7 output).
// Aggregates signals produced by M1–M6 into the metrics named in the
// group's report: consent-decline rate, unused-account rate, complaints,
// open alerts, overdue cases, resolved cases, and threshold/config changes.
export async function getKriSummary() {
  const [
    totalConsents,
    declinedOrExpiredConsents,
    totalAccounts,
    lapsedAccounts,
    complaints,
    openAlerts,
    cases,
    configChanges,
  ] = await Promise.all([
    prisma.consentRequest.count(),
    prisma.consentRequest.count({ where: { status: { in: ['DECLINED', 'EXPIRED'] } } }),
    prisma.account.count(),
    prisma.account.count({ where: { incentiveStatus: 'LAPSED' } }),
    prisma.report.count(),
    prisma.conductAlert.count({ where: { status: 'OPEN' } }),
    prisma.case.findMany(),
    prisma.configChangeLog.findMany({ orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);

  const now = new Date();
  const overdueCases = cases.filter((c) => c.status !== 'RESOLVED' && c.deadlineAt < now).length;
  const resolvedCases = cases.filter((c) => c.status === 'RESOLVED').length;

  const consentDeclineRate = totalConsents > 0 ? declinedOrExpiredConsents / totalConsents : 0;
  const unusedAccountRate = totalAccounts > 0 ? lapsedAccounts / totalAccounts : 0;

  return {
    consentDeclineRate,
    unusedAccountRate,
    complaints,
    openAlerts,
    overdueCases,
    resolvedCases,
    configChanges,
  };
}
