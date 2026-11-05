// Pure scoring logic: metric calculation, peer-relative scoring and plain-language
// explanations. CommonJS (like the rest of the engine) so prisma/seed.js can run the
// same code as the app instead of a copy that could drift.

const DAY = 24 * 60 * 60 * 1000;
const WINDOW_DAYS = 56; // the rolling window for volume-style metrics

const DEFAULT_CONFIG = [
  ['weight_unused', 'Unused account rate weight', 'WEIGHT', 25, 'POINTS', 'Share of the score from accounts with no genuine use in 90 days.'],
  ['weight_transfer', 'Internal transfer funding weight', 'WEIGHT', 20, 'POINTS', 'Share of the score from accounts funded only from the same customer.'],
  ['weight_complaints', 'Customer complaint weight', 'WEIGHT', 20, 'POINTS', 'Share of the score from complaints. "Did not authorise" counts three times.'],
  ['weight_closure', 'Early closure weight', 'WEIGHT', 10, 'POINTS', 'Share of the score from accounts closed within 60 days.'],
  ['weight_contact', 'Contact detail change weight', 'WEIGHT', 10, 'POINTS', 'Share of the score from contact changes near an account opening.'],
  ['weight_sameday', 'Same-day multiple products weight', 'WEIGHT', 8, 'POINTS', 'Share of the score from several products sold to one customer on one day.'],
  ['weight_accounts', 'Accounts opened weight', 'WEIGHT', 7, 'POINTS', 'Share of the score from unusually high weekly volume.'],
  ['harm_points', 'Customer harm uplift', 'WEIGHT', 10, 'POINTS', 'Most points added for the number of customers affected, so the score reflects harm as well as likelihood.'],
  ['harm_customers', 'Customers for full harm uplift', 'WEIGHT', 40, 'CUSTOMERS', 'Number of affected customers that earns the full harm uplift.'],
  ['level_medium', 'Medium risk threshold', 'LEVEL', 40, 'SCORE', 'Scores from here open a case for the team lead, with 5 working days to review.'],
  ['level_high', 'High risk threshold', 'LEVEL', 70, 'SCORE', 'Scores from here open a case for the conduct risk team, with 48 hours to review, and are reported to the audit committee.'],
  ['pressure_flag', 'Pressure Index High threshold', 'LEVEL', 70, 'SCORE', 'A branch at or above this index is rated High, and its manager and target are reviewed.'],
  ['branch_high_share', 'Branch High staff share', 'LEVEL', 30, 'PERCENT', 'A branch is also rated High when this share of its staff are rated High.'],
  ['fast_review_count', 'Unusually fast reviews', 'WATCH', 5, 'CASES', 'One reviewer closing this many cases within an hour raises a warning sign.'],
  ['flag_drop_pct', 'Sudden drop in flags', 'WATCH', 50, 'PERCENT', 'Flags falling by this much in a month while sales volumes hold raises a warning sign.'],
];

const METRICS = [
  { key: 'unused', label: 'Unused account rate', unit: 'pct', weightKey: 'weight_unused', floor: 0.03, justification: 'An account the customer never uses may have been opened without their authorisation.' },
  { key: 'transfer', label: 'Internal transfer funding rate', unit: 'pct', weightKey: 'weight_transfer', floor: 0.03, justification: 'Moving a customer\'s own money can make a new account look funded when it is not.' },
  { key: 'complaints', label: 'Customer complaint rate', unit: 'per100', weightKey: 'weight_complaints', floor: 1, justification: 'Complaints show where customers themselves see a problem with an account.' },
  { key: 'closure', label: 'Early closure rate', unit: 'pct', weightKey: 'weight_closure', floor: 0.02, justification: 'Customers often close accounts they never asked for once they find them.' },
  { key: 'contact', label: 'Contact detail changes', unit: 'per100', weightKey: 'weight_contact', floor: 1, justification: 'Changed contact details can stop a customer learning about a new account.' },
  { key: 'sameDay', label: 'Same-day multiple products', unit: 'pct', weightKey: 'weight_sameday', floor: 0.02, justification: 'Selling several products to one customer in a day is common under sales pressure.' },
  { key: 'accounts', label: 'Accounts opened per week', unit: 'count', weightKey: 'weight_accounts', floor: 0.5, justification: 'Unusually high volume can be a sign of sales pressure.' },
];

const COMPLAINT_WEIGHT = { DID_NOT_AUTHORISE: 3, SERVICE: 1, OTHER: 1 };

function configMap(rows) {
  return Object.fromEntries(rows.map((r) => [r.key, r.value]));
}

function median(sorted) {
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function quantile(sorted, q) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))];
}

const within = (date, from, to) => date > from && date <= to;
const daysBetween = (a, b) => (b.getTime() - a.getTime()) / DAY;

function isUnused(a) {
  return !a.firstGenuineActivityAt || daysBetween(a.openedAt, a.firstGenuineActivityAt) > 90;
}
function isEarlyClosure(a) {
  return !!a.closedAt && daysBetween(a.openedAt, a.closedAt) <= 60;
}
function isContactChangeNearOpening(a) {
  return !!a.contactChangeAt && Math.abs(daysBetween(a.openedAt, a.contactChangeAt)) <= 14;
}

// The specific accounts behind an employee's flags, with the reason for each. Attached
// to cases as evidence and shown on profiles.
function flaggedAccounts(accounts, complaints, asOf) {
  const byAccount = new Map();
  for (const c of complaints) {
    if (c.receivedAt <= asOf) byAccount.set(c.accountId, [...(byAccount.get(c.accountId) || []), c]);
  }
  return accounts
    .filter((a) => a.openedAt <= asOf && (asOf - a.openedAt) / DAY <= 90 + WINDOW_DAYS)
    .map((a) => {
      const age = (asOf - a.openedAt) / DAY;
      const reasons = [];
      const list = byAccount.get(a.id) || [];
      if (list.some((c) => c.category === 'DID_NOT_AUTHORISE')) reasons.push('"Did not authorise" complaint');
      else if (list.length) reasons.push('Complaint');
      if (age >= 90 && isUnused(a)) reasons.push('No genuine use in 90 days');
      if (a.fundingSource === 'INTERNAL_TRANSFER_ONLY' && age <= WINDOW_DAYS) reasons.push('Funded only by own transfer');
      if (age >= 60 && isEarlyClosure(a)) reasons.push('Closed within 60 days');
      if (age <= WINDOW_DAYS && isContactChangeNearOpening(a)) reasons.push('Contact change near opening');
      return { ref: a.ref, customerRef: a.customerRef, product: a.product, openedAt: a.openedAt, reasons };
    })
    .filter((a) => a.reasons.length)
    .sort((x, y) => y.reasons.length - x.reasons.length || y.openedAt - x.openedAt);
}

// Each outcome metric looks at the cohort old enough to have an outcome: unused needs
// 90 days of history, early closure needs 60.
function computeMetrics(accounts, complaints, asOf) {
  const t = asOf.getTime();
  const recentFrom = new Date(t - WINDOW_DAYS * DAY);
  const recent = accounts.filter((a) => within(a.openedAt, recentFrom, asOf));
  const unusedCohort = accounts.filter((a) => within(a.openedAt, new Date(t - (90 + WINDOW_DAYS) * DAY), new Date(t - 90 * DAY)));
  const closureCohort = accounts.filter((a) => within(a.openedAt, new Date(t - (60 + WINDOW_DAYS) * DAY), new Date(t - 60 * DAY)));

  const rate = (n, d) => (d ? n / d : 0);
  const unusedRows = unusedCohort.filter((a) => isUnused(a));
  const transferRows = recent.filter((a) => a.fundingSource === 'INTERNAL_TRANSFER_ONLY');
  const closedRows = closureCohort.filter((a) => isEarlyClosure(a));
  const contact = recent.filter((a) => isContactChangeNearOpening(a)).length;

  const byCustomerDay = new Map();
  for (const a of recent) {
    const k = `${a.customerRef}|${a.openedAt.toISOString().slice(0, 10)}`;
    byCustomerDay.set(k, (byCustomerDay.get(k) || 0) + 1);
  }
  const sameDay = [...byCustomerDay.values()].filter((n) => n >= 2).length;

  const recentComplaints = complaints.filter((c) => within(c.receivedAt, recentFrom, asOf));
  const weighted = recentComplaints.reduce((n, c) => n + (COMPLAINT_WEIGHT[c.category] || 1), 0);
  const dnaWindow = recentComplaints.filter((c) => c.category === 'DID_NOT_AUTHORISE');

  // Customers affected: anyone with an unused, simulated-funding or early-closure
  // account, or a "did not authorise" complaint.
  const affected = new Set([...unusedRows, ...transferRows, ...closedRows].map((a) => a.customerRef));
  const refByAccount = new Map(accounts.map((a) => [a.id, a.customerRef]));
  for (const c of dnaWindow) if (refByAccount.has(c.accountId)) affected.add(refByAccount.get(c.accountId));

  return {
    values: {
      unused: rate(unusedRows.length, unusedCohort.length),
      transfer: rate(transferRows.length, recent.length),
      complaints: rate(weighted, recent.length) * 100,
      closure: rate(closedRows.length, closureCohort.length),
      contact: rate(contact, recent.length) * 100,
      sameDay: rate(sameDay, byCustomerDay.size),
      accounts: recent.length / (WINDOW_DAYS / 7),
    },
    counts: {
      unused: unusedRows.length, unusedCohort: unusedCohort.length, transfer: transferRows.length, recent: recent.length,
      closed: closedRows.length, closureCohort: closureCohort.length, contact, sameDay, customers: byCustomerDay.size,
      complaints: recentComplaints.length, dnaWindow: dnaWindow.length, customersAffected: affected.size,
    },
  };
}

function levelFor(score, config) {
  if (score >= config.level_high) return 'HIGH';
  return score >= config.level_medium ? 'MEDIUM' : 'LOW';
}

function groupStats(vals, floor) {
  const sorted = [...vals].sort((a, b) => a - b);
  const med = median(sorted);
  const mad = median(sorted.map((v) => Math.abs(v - med)).sort((a, b) => a - b));
  return { median: med, p25: quantile(sorted, 0.25), p75: quantile(sorted, 0.75), spread: Math.max(1.4826 * mad, floor) };
}

// Peer-relative: a robust z-score (median and MAD) against people in the same role and
// against the same role within the branch. The higher of the two counts. Branch peers
// catch someone who stands out locally. Role peers keep a whole branch under pressure
// from looking normal against itself.
function computeRiskTable({ employees, accounts, complaints, config, asOf }) {
  const accountsByEmp = groupBy(accounts, 'employeeId');
  const complaintsByEmp = groupBy(complaints, 'employeeId');
  const scored = employees.filter((e) => !e.isManager && e.status === 'ACTIVE');
  const computed = scored.map((e) => ({ employee: e, ...computeMetrics(accountsByEmp.get(e.id) || [], complaintsByEmp.get(e.id) || [], asOf) }));

  const stats = {};
  for (const m of METRICS) {
    const byRole = new Map();
    const byBranch = new Map();
    for (const c of computed) {
      const role = c.employee.position;
      const branch = `${role}|${c.employee.branchId}`;
      byRole.set(role, [...(byRole.get(role) || []), c.values[m.key]]);
      byBranch.set(branch, [...(byBranch.get(branch) || []), c.values[m.key]]);
    }
    stats[m.key] = {
      role: new Map([...byRole].map(([k, v]) => [k, groupStats(v, m.floor)])),
      branch: new Map([...byBranch].map(([k, v]) => [k, groupStats(v, m.floor)])),
    };
  }

  const totalWeight = METRICS.reduce((n, m) => n + config[m.weightKey], 0) || 1;
  return computed.map((c) => {
    const metrics = {};
    let points = 0;
    for (const m of METRICS) {
      const roleStats = stats[m.key].role.get(c.employee.position);
      const branchStats = stats[m.key].branch.get(`${c.employee.position}|${c.employee.branchId}`);
      const zRole = (c.values[m.key] - roleStats.median) / roleStats.spread;
      const zBranch = (c.values[m.key] - branchStats.median) / branchStats.spread;
      const z = Math.max(zRole, zBranch);
      const capped = Math.max(0, Math.min(3, z));
      const contribution = (config[m.weightKey] * capped) / 3;
      points += contribution;
      metrics[m.key] = {
        value: round(c.values[m.key]),
        median: round(roleStats.median),
        branchMedian: round(branchStats.median),
        p25: round(roleStats.p25),
        p75: round(roleStats.p75),
        z: Math.round(z * 100) / 100,
        weight: config[m.weightKey],
        contribution: Math.round(((contribution * 100) / totalWeight) * 10) / 10,
      };
    }
    const harm = config.harm_points * Math.min(1, c.counts.customersAffected / (config.harm_customers || 1));
    const score = Math.min(100, Math.round((points * 100) / totalWeight + harm));
    return {
      employeeId: c.employee.id,
      branchId: c.employee.branchId,
      asOf,
      score,
      level: levelFor(score, config),
      metrics: { ...metrics, harm: Math.round(harm * 10) / 10, counts: c.counts },
    };
  });
}

function round(n) {
  return Math.round(n * 10000) / 10000;
}

function groupBy(rows, key) {
  const map = new Map();
  for (const r of rows) {
    if (!map.has(r[key])) map.set(r[key], []);
    map.get(r[key]).push(r);
  }
  return map;
}

function formatMetric(unit, value) {
  if (value === null || value === undefined) return 'None';
  if (unit === 'pct') return `${Math.round(value * 100)}%`;
  if (unit === 'per100') return `${(Math.round(value * 10) / 10).toString()} per 100`;
  return (Math.round(value * 10) / 10).toString();
}

// Plain-language explanation for employees and reviewers.
function explainMetric(metric, m, counts) {
  const you = formatMetric(metric.unit, m.value);
  const peers = formatMetric(metric.unit, m.median);
  const c = counts || {};
  const detail = {
    unused: `${c.unused ?? 0} of your ${c.unusedCohort ?? 0} accounts opened 90 to 146 days ago had no genuine customer activity within 90 days.`,
    transfer: `${c.transfer ?? 0} of your ${c.recent ?? 0} recent accounts were funded only by a transfer from the same customer's existing account.`,
    complaints: `${c.complaints ?? 0} complaints are linked to your recent accounts, ${c.dnaWindow ?? 0} of them "did not authorise", which count three times.`,
    closure: `${c.closed ?? 0} of your ${c.closureCohort ?? 0} accounts opened 60 to 116 days ago were closed within 60 days.`,
    contact: `${c.contact ?? 0} of your ${c.recent ?? 0} recent accounts had a customer email or phone change within 14 days of opening.`,
    sameDay: `${c.sameDay ?? 0} of your ${c.customers ?? 0} recent customers were given more than one product on the same day.`,
    accounts: `You opened about ${you} accounts per week over the last 8 weeks.`,
  }[metric.key];
  const compare = m.z >= 1 ? `That stands out from the ${peers} typical for your role.` : `That is in line with your peers, where ${peers} is typical for your role.`;
  return `${detail} ${compare}`;
}

module.exports = {
  DAY, WINDOW_DAYS, DEFAULT_CONFIG, METRICS, COMPLAINT_WEIGHT,
  configMap, computeMetrics, computeRiskTable, levelFor, groupBy, formatMetric, explainMetric, flaggedAccounts,
  isUnused, isEarlyClosure, isContactChangeNearOpening, median,
};
