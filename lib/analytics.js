import { THRESHOLDS } from '@/lib/thresholds';

// M4 — Conduct Analytics engine. Pulls signals from every other module into
// one per-banker and per-branch view, compares them against the governed
// thresholds (M7), and raises pattern alerts.

const DAY = 24 * 60 * 60 * 1000;

export async function loadThresholds(prisma) {
  const rows = await prisma.threshold.findMany();
  return THRESHOLDS.map((def) => {
    const row = rows.find((r) => r.key === def.key);
    return { ...def, value: row ? row.value : def.value, updatedAt: row?.updatedAt || null };
  });
}

async function collectMetrics(prisma) {
  const since90 = new Date(Date.now() - 90 * DAY);
  const [branches, bankers, accounts, contactFlags, reversals, reports] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: 'asc' } }),
    prisma.banker.findMany({ include: { branch: true }, orderBy: { name: 'asc' } }),
    prisma.account.findMany({ include: { consentRequest: true } }),
    prisma.contactChangeRequest.findMany({ where: { status: { in: ['BLOCKED', 'CANCELLED_BY_CUSTOMER'] } } }),
    prisma.transaction.findMany({ where: { kind: 'STAFF_REVERSAL' }, include: { account: true } }),
    prisma.report.findMany({ where: { createdAt: { gte: since90 } } }),
  ]);

  const bankerRows = bankers.map((b) => {
    const mine = accounts.filter((a) => a.bankerId === b.id);
    const answered = mine.filter((a) => a.consentRequest && a.consentRequest.status !== 'PENDING');
    const declined = answered.filter((a) => ['DECLINED', 'EXPIRED'].includes(a.consentRequest.status)).length;
    const reviewed = mine.filter((a) => a.status === 'ACTIVE' && ['PAID', 'LAPSED'].includes(a.incentiveStatus));
    const lapsed = reviewed.filter((a) => a.incentiveStatus === 'LAPSED').length;
    return {
      id: b.id,
      name: b.name,
      branchId: b.branchId,
      branchName: b.branch.name,
      accountsOpened: mine.length,
      detail: { answered: answered.length, declined, reviewed: reviewed.length, lapsed },
      metrics: {
        CONSENT_DECLINE_RATE: answered.length ? Math.round((declined / answered.length) * 100) : null,
        UNUSED_ACCOUNT_RATE: reviewed.length ? Math.round((lapsed / reviewed.length) * 100) : null,
        CONTACT_CHANGE_FLAGS: contactFlags.filter((c) => c.bankerId === b.id).length,
        STAFF_FUNDING_REVERSALS: reversals.filter((t) => t.account.bankerId === b.id).length,
      },
    };
  });

  const branchRows = branches.map((br) => ({
    id: br.id,
    name: br.name,
    bankers: bankerRows.filter((b) => b.branchId === br.id).length,
    accounts: accounts.filter((a) => a.branchId === br.id).length,
    metrics: { SPEAK_UP_REPORTS: reports.filter((r) => r.branchId === br.id).length },
  }));

  return { bankerRows, branchRows };
}

function withBreaches(rows, values) {
  return rows.map((row) => {
    const breaches = Object.entries(row.metrics)
      .filter(([key, value]) => value !== null && values[key] !== undefined && value >= values[key])
      .map(([key]) => key);
    return { ...row, breaches, riskScore: breaches.length };
  });
}

// overrides: { [thresholdKey]: value } — used by M7 to preview a proposed change.
export async function computeRiskMap(prisma, overrides = {}) {
  const thresholds = await loadThresholds(prisma);
  const values = Object.fromEntries(thresholds.map((t) => [t.key, t.value]));
  Object.assign(values, overrides);
  const { bankerRows, branchRows } = await collectMetrics(prisma);
  const bankers = withBreaches(bankerRows, values).sort((a, b) => b.riskScore - a.riskScore || a.name.localeCompare(b.name));
  const branches = withBreaches(branchRows, values);
  const totalBreaches =
    bankers.reduce((n, b) => n + b.breaches.length, 0) + branches.reduce((n, b) => n + b.breaches.length, 0);
  return { thresholds, values, bankers, branches, totalBreaches };
}

function describeBreaches(row, thresholds) {
  return row.breaches
    .map((key) => {
      const t = thresholds.find((x) => x.key === key);
      const unit = t.unit === 'PERCENT' ? '%' : '';
      return `${t.label.toLowerCase()} ${row.metrics[key]}${unit} (threshold ${t.value}${unit})`;
    })
    .join('; ');
}

// Raise one pattern alert per breaching banker / branch, unless an open or
// escalated one already exists for them. Records the run for M7's coverage report.
export async function runAnalytics(prisma) {
  const map = await computeRiskMap(prisma);
  const existing = await prisma.conductAlert.findMany({
    where: { source: 'M4', status: { in: ['OPEN', 'ESCALATED'] } },
  });
  const raised = [];

  for (const b of map.bankers.filter((x) => x.breaches.length > 0)) {
    if (existing.some((a) => a.type === 'BANKER_PATTERN' && a.bankerId === b.id)) continue;
    raised.push(
      await prisma.conductAlert.create({
        data: {
          type: 'BANKER_PATTERN',
          severity: b.breaches.length >= 2 ? 'HIGH' : 'MEDIUM',
          source: 'M4',
          description: `${b.name} (${b.branchName}) breached ${b.breaches.length} of 4 conduct thresholds: ${describeBreaches(b, map.thresholds)}.`,
          branchId: b.branchId,
          bankerId: b.id,
          status: 'OPEN',
        },
      }),
    );
  }

  for (const br of map.branches.filter((x) => x.breaches.length > 0)) {
    const already = existing.some(
      (a) => (a.type === 'BRANCH_PATTERN' || a.type === 'BRANCH_WIDE_PATTERN') && a.branchId === br.id && !a.bankerId,
    );
    if (already) continue;
    raised.push(
      await prisma.conductAlert.create({
        data: {
          type: 'BRANCH_PATTERN',
          severity: 'MEDIUM',
          source: 'M4',
          description: `${br.name}: ${describeBreaches(br, map.thresholds)}.`,
          branchId: br.id,
          status: 'OPEN',
        },
      }),
    );
  }

  const run = await prisma.analyticsRun.create({
    data: { alertsRaised: raised.length, bankersScanned: map.bankers.length, branchesScanned: map.branches.length },
  });
  return { raised, run, map };
}
