import { prisma } from '@/lib/prisma';
import { DAY, flaggedAccounts } from '@/lib/scoring';

// Everything shown about one employee: latest score, history and the accounts behind
// each flag. The employee's own page and the admin profile read the same record.
export async function getEmployeeRecord(employeeId) {
  const [employee, scores] = await Promise.all([
    prisma.employee.findUnique({ where: { id: employeeId }, include: { branch: true } }),
    prisma.riskScore.findMany({ where: { employeeId }, orderBy: { asOf: 'asc' } }),
  ]);
  if (!employee) return null;
  const latest = scores[scores.length - 1] || null;
  let flagged = [];
  if (latest) {
    const [accounts, complaints] = await Promise.all([
      prisma.accountRecord.findMany({ where: { employeeId, openedAt: { gt: new Date(latest.asOf.getTime() - 146 * DAY), lte: latest.asOf } } }),
      prisma.complaint.findMany({ where: { employeeId } }),
    ]);
    flagged = flaggedAccounts(accounts, complaints, latest.asOf);
  }
  const history = scores.slice(-12).map((s) => ({ asOf: s.asOf, score: s.score, level: s.level, metrics: s.metrics }));
  return { employee, latest, history, flaggedAccounts: flagged };
}
