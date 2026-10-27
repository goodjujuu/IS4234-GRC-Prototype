// M3 — Usage-Linked Incentive Engine.
// Opening an account earns the banker only a *provisional* credit. It is paid
// out if the customer genuinely uses the account within 90 days, with a bonus
// if it is still open at 12 months. Staff-initiated activity (e.g. funding the
// account and reversing it) never counts as use.

const DAY = 24 * 60 * 60 * 1000;
export const USAGE_WINDOW_DAYS = 90;
export const RETENTION_DAYS = 365;
export const RETENTION_BONUS = 25;

// accountId (optional) limits the review to one account — used by the demo's
// per-account fast-forward so other accounts are not reviewed early.
export async function runUsageReview(prisma, { asOf = new Date(), accountId } = {}) {
  const outcomes = [];

  const due = await prisma.account.findMany({
    where: {
      ...(accountId ? { id: accountId } : {}),
      status: 'ACTIVE',
      incentiveStatus: 'PROVISIONAL',
      activatedAt: { lte: new Date(asOf.getTime() - USAGE_WINDOW_DAYS * DAY) },
    },
    include: { banker: true, branch: true, transactions: true },
  });

  for (const a of due) {
    const windowEnd = new Date(a.activatedAt.getTime() + USAGE_WINDOW_DAYS * DAY);
    const genuine = a.transactions.filter((t) => t.initiatedBy === 'CUSTOMER' && t.createdAt <= windowEnd);
    const staff = a.transactions.filter((t) => t.initiatedBy === 'STAFF');

    if (genuine.length > 0) {
      await prisma.account.update({ where: { id: a.id }, data: { incentiveStatus: 'PAID' } });
      const note = `New account creation incentive credited to ${a.banker.name}: ${a.customerName} used their ${a.product} ${genuine.length} time${genuine.length === 1 ? '' : 's'} within 90 days.`;
      await prisma.incentiveEvent.create({
        data: { bankerId: a.bankerId, accountId: a.id, kind: 'PAID', amount: a.incentiveAmount, note },
      });
      outcomes.push({ kind: 'PAID', bankerName: a.banker.name, customerName: a.customerName, amount: a.incentiveAmount, note });
    } else {
      await prisma.account.update({ where: { id: a.id }, data: { incentiveStatus: 'LAPSED' } });
      const why = staff.length
        ? 'the only activity was staff-initiated funding that was later reversed'
        : 'the customer never used it';
      const note = `Incentive lapsed for ${a.banker.name}: ${a.customerName}’s ${a.product} reached 90 days and ${why}.`;
      await prisma.incentiveEvent.create({
        data: { bankerId: a.bankerId, accountId: a.id, kind: 'LAPSED', amount: a.incentiveAmount, note },
      });
      await prisma.conductAlert.create({
        data: {
          type: 'UNUSED_ACCOUNT_90D',
          severity: staff.length ? 'HIGH' : 'MEDIUM',
          source: 'M3',
          description: `${a.customerName}’s ${a.product} (opened by ${a.banker.name}) is unused after 90 days: ${why}. Incentive lapsed and account flagged for review.`,
          branchId: a.branchId,
          bankerId: a.bankerId,
          accountId: a.id,
          status: 'OPEN',
        },
      });
      outcomes.push({ kind: 'LAPSED', bankerName: a.banker.name, customerName: a.customerName, amount: a.incentiveAmount, note });
    }
  }

  const retained = await prisma.account.findMany({
    where: {
      ...(accountId ? { id: accountId } : {}),
      status: 'ACTIVE',
      incentiveStatus: 'PAID',
      activatedAt: { lte: new Date(asOf.getTime() - RETENTION_DAYS * DAY) },
    },
    include: { banker: true, incentiveEvents: true },
  });
  for (const a of retained) {
    if (a.incentiveEvents.some((e) => e.kind === 'RETENTION_BONUS')) continue;
    const note = `12-month retention bonus credited to ${a.banker.name}: ${a.customerName}’s ${a.product} is still open and in use after a year.`;
    await prisma.incentiveEvent.create({
      data: { bankerId: a.bankerId, accountId: a.id, kind: 'RETENTION_BONUS', amount: RETENTION_BONUS, note },
    });
    outcomes.push({ kind: 'RETENTION_BONUS', bankerName: a.banker.name, customerName: a.customerName, amount: RETENTION_BONUS, note });
  }

  return outcomes;
}
