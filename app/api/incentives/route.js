import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// M3 — incentive ledger: every banker's provisional / paid / lapsed credit,
// the accounts behind it, and the recent ledger events.
export async function GET() {
  const [bankers, accounts, events, openAlerts] = await Promise.all([
    prisma.banker.findMany({ include: { branch: true }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({
      include: { transactions: true, consentRequest: true, branch: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.incentiveEvent.findMany({
      include: { banker: true, account: true },
      orderBy: { createdAt: 'desc' },
      take: 60,
    }),
    prisma.conductAlert.groupBy({ by: ['bankerId'], where: { status: { in: ['OPEN', 'ESCALATED'] } }, _count: { _all: true } }),
  ]);

  const ledger = bankers.map((b) => {
    const mine = accounts.filter((a) => a.bankerId === b.id);
    const sum = (filter) => mine.filter(filter).reduce((n, a) => n + a.incentiveAmount, 0);
    const bonuses = events.filter((e) => e.bankerId === b.id && e.kind === 'RETENTION_BONUS');
    const consents = mine.filter((a) => a.consentRequest && a.consentRequest.status !== 'PENDING');
    return {
      id: b.id,
      name: b.name,
      branchName: b.branch.name,
      totals: {
        provisional: sum((a) => a.status === 'ACTIVE' && a.incentiveStatus === 'PROVISIONAL'),
        paid: sum((a) => a.incentiveStatus === 'PAID'),
        lapsed: sum((a) => a.incentiveStatus === 'LAPSED'),
        bonus: bonuses.reduce((n, e) => n + e.amount, 0),
      },
      scorecardInputs: {
        opened: mine.length,
        paid: mine.filter((a) => a.incentiveStatus === 'PAID').length,
        lapsed: mine.filter((a) => a.incentiveStatus === 'LAPSED').length,
        consents: consents.length,
        declined: consents.filter((a) => ['DECLINED', 'EXPIRED'].includes(a.consentRequest.status)).length,
        openAlerts: openAlerts.find((x) => x.bankerId === b.id)?._count._all || 0,
      },
    };
  });

  return NextResponse.json({ ledger, accounts, events });
}
