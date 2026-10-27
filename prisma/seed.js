// Seeds synthetic, reproducible demo data — committed to the repo rather than
// synced live, so grading/demo runs are deterministic (mirrors the is4228
// reference project's approach to avoiding live external data dependencies).
//
// The story: Riverside Branch's Ben Lim shows the Wells Fargo pattern —
// declined/ignored consent requests, an account he funded and reversed to make
// it look used, a blocked attempt to put his own number on a customer account,
// and speak-up reports from colleagues. Alice Tan, Daniel Koh and Chloe Ng are
// clean comparisons.
const { createHash } = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n) => new Date(Date.now() - n * DAY);

// Must match lib/hashChain.js
function entryHash({ prevHash, change, changedBy, signedOffBy, createdAt }) {
  const payload = [prevHash || 'GENESIS', change, changedBy, signedOffBy, new Date(createdAt).toISOString()].join('|');
  return createHash('sha256').update(payload).digest('hex');
}

// Must match lib/thresholds.js
const THRESHOLDS = [
  ['CONSENT_DECLINE_RATE', 'Consent declined or ignored', 'PERCENT', 40, 'Share of a banker’s new-account consent requests that customers declined or never answered (M2).'],
  ['UNUSED_ACCOUNT_RATE', 'Accounts unused after 90 days', 'PERCENT', 20, 'Share of a banker’s reviewed accounts whose incentive lapsed because the customer never used them (M3).'],
  ['CONTACT_CHANGE_FLAGS', 'Blocked or disputed contact changes', 'COUNT', 1, 'Contact-detail changes by a banker that M1 blocked or the customer disputed.'],
  ['STAFF_FUNDING_REVERSALS', 'Staff transfer-and-reverse fundings', 'COUNT', 1, 'Times a banker funded a customer’s new account and then reversed it, to make it look used (M3).'],
  ['SPEAK_UP_REPORTS', 'Speak-up reports about a branch (90 days)', 'COUNT', 2, 'Speak-up reports naming the branch in the last 90 days (M5).'],
];

async function account(data) {
  const { consent, txns = [], events = [], ...fields } = data;
  const created = await prisma.account.create({
    data: {
      ...fields,
      consentRequest: consent ? { create: consent } : undefined,
    },
  });
  for (const t of txns) await prisma.transaction.create({ data: { accountId: created.id, ...t } });
  for (const e of events) {
    await prisma.incentiveEvent.create({ data: { accountId: created.id, bankerId: fields.bankerId, ...e } });
  }
  return created;
}

async function main() {
  console.log('Seeding...');

  // Clear existing data (children first).
  await prisma.caseEvent.deleteMany();
  await prisma.case.deleteMany();
  await prisma.conductAlert.deleteMany();
  await prisma.contactChangeRequest.deleteMany();
  await prisma.incentiveEvent.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.consentRequest.deleteMany();
  await prisma.account.deleteMany();
  await prisma.report.deleteMany();
  await prisma.configChangeLog.deleteMany();
  await prisma.thresholdChangeRequest.deleteMany();
  await prisma.threshold.deleteMany();
  await prisma.analyticsRun.deleteMany();
  await prisma.banker.deleteMany();
  await prisma.branch.deleteMany();

  // ---------- Branches & bankers ----------
  const downtown = await prisma.branch.create({ data: { name: 'Downtown Branch', region: 'Central' } });
  const riverside = await prisma.branch.create({ data: { name: 'Riverside Branch', region: 'West' } });
  const harbour = await prisma.branch.create({ data: { name: 'Harbourfront Branch', region: 'South' } });

  const alice = await prisma.banker.create({ data: { name: 'Alice Tan', mobile: '90012233', branchId: downtown.id } });
  const ben = await prisma.banker.create({ data: { name: 'Ben Lim', mobile: '90045566', branchId: riverside.id } });
  const daniel = await prisma.banker.create({ data: { name: 'Daniel Koh', mobile: '90078899', branchId: riverside.id } });
  const chloe = await prisma.banker.create({ data: { name: 'Chloe Ng', mobile: '90031122', branchId: harbour.id } });

  const approved = (d) => ({ channel: 'SMS', status: 'APPROVED', sentAt: daysAgo(d + 1), respondedAt: daysAgo(d) });
  const cust = (kind, cents, description, d) => ({ kind, amountCents: cents, description, initiatedBy: 'CUSTOMER', createdAt: daysAgo(d) });

  // ---------- Accounts ----------
  // Healthy: consented, used, incentive paid.
  await account({
    customerName: 'Chandra Wijaya', branchId: downtown.id, bankerId: alice.id,
    status: 'ACTIVE', incentiveStatus: 'PAID', activatedAt: daysAgo(120), lastUsedAt: daysAgo(3),
    mobile: '91234567', email: 'chandra.wijaya@gmail.com', pinStatus: 'SET_BY_CUSTOMER', pinSetAt: daysAgo(118),
    consent: approved(120),
    txns: [
      cust('SALARY_CREDIT', 420000, 'Salary — Acme Logistics', 110),
      cust('CARD_PAYMENT', -1240, 'Kopi Corner', 100),
      cust('BILL_PAYMENT', -8450, 'SP Utilities bill', 60),
    ],
    events: [
      { kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Chandra Wijaya’s Savings Account.', createdAt: daysAgo(120) },
      { kind: 'PAID', amount: 50, note: 'New account creation incentive credited to Alice Tan: Chandra Wijaya used their Savings Account 3 times within 90 days.', createdAt: daysAgo(30) },
    ],
  });

  // Ben's lapsed account: he funded it and reversed it to fake usage.
  const marcus = await account({
    customerName: 'Marcus Lee', branchId: riverside.id, bankerId: ben.id,
    status: 'ACTIVE', incentiveStatus: 'LAPSED', activatedAt: daysAgo(95),
    mobile: '81234567', email: 'marcus.lee@outlook.com',
    consent: approved(95),
    txns: [
      { kind: 'STAFF_TRANSFER_IN', amountCents: 5000, description: 'Branch transfer — initial funding', initiatedBy: 'STAFF', createdAt: daysAgo(94) },
      { kind: 'STAFF_REVERSAL', amountCents: -5000, description: 'Reversal — initial funding', initiatedBy: 'STAFF', createdAt: daysAgo(92) },
    ],
    events: [
      { kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Marcus Lee’s Savings Account.', createdAt: daysAgo(95) },
      { kind: 'LAPSED', amount: 50, note: 'Incentive lapsed for Ben Lim: Marcus Lee’s Savings Account reached 90 days and the only activity was staff-initiated funding that was later reversed.', createdAt: daysAgo(5) },
    ],
  });

  // Provisional accounts — the live M3 demo targets.
  await account({
    customerName: 'Priya Raman', branchId: riverside.id, bankerId: ben.id,
    status: 'ACTIVE', incentiveStatus: 'PROVISIONAL', activatedAt: daysAgo(20),
    mobile: '82345678', email: 'priya.raman@gmail.com',
    consent: approved(20),
    events: [{ kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Priya Raman’s Savings Account.', createdAt: daysAgo(20) }],
  });
  await account({
    customerName: 'Wei Jie Tan', branchId: downtown.id, bankerId: alice.id,
    status: 'ACTIVE', incentiveStatus: 'PROVISIONAL', activatedAt: daysAgo(40),
    mobile: '93456789', email: 'weijie.tan@yahoo.com',
    consent: approved(40),
    txns: [cust('CARD_PAYMENT', -2350, 'FairPrice Supermarket', 35)],
    events: [{ kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Wei Jie Tan’s Savings Account.', createdAt: daysAgo(40) }],
  });
  await account({
    customerName: 'Farah Ismail', branchId: riverside.id, bankerId: daniel.id,
    status: 'ACTIVE', incentiveStatus: 'PROVISIONAL', activatedAt: daysAgo(12),
    mobile: '84567890', email: 'farah.ismail@gmail.com',
    consent: approved(12),
    events: [{ kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Farah Ismail’s Savings Account.', createdAt: daysAgo(12) }],
  });
  // Long-standing customer: due a 12-month retention bonus at the next review.
  await account({
    customerName: 'Grace Lim', branchId: harbour.id, bankerId: chloe.id,
    status: 'ACTIVE', incentiveStatus: 'PAID', activatedAt: daysAgo(370),
    mobile: '95678901', email: 'grace.lim@gmail.com', pinStatus: 'SET_BY_CUSTOMER', pinSetAt: daysAgo(368),
    consent: approved(370),
    txns: [cust('SALARY_CREDIT', 515000, 'Salary — Harbour Holdings', 360), cust('CARD_PAYMENT', -1890, 'Toast Box', 20)],
    events: [
      { kind: 'PROVISIONAL', amount: 50, note: 'Provisional credit for opening Grace Lim’s Savings Account.', createdAt: daysAgo(370) },
      { kind: 'PAID', amount: 50, note: 'New account creation incentive credited to Chloe Ng: Grace Lim used their Savings Account 2 times within 90 days.', createdAt: daysAgo(280) },
    ],
  });

  // Consent blocked at M2 (Ben's pattern), plus one genuine miss at Downtown.
  const siti = await account({
    customerName: 'Siti Rahman', branchId: riverside.id, bankerId: ben.id, status: 'DECLINED', mobile: '86789012',
    consent: { channel: 'SMS', status: 'DECLINED', sentAt: daysAgo(15), respondedAt: daysAgo(15) },
  });
  const ahmad = await account({
    customerName: 'Ahmad Yusof', branchId: riverside.id, bankerId: ben.id, status: 'EXPIRED', mobile: '87890123',
    consent: { channel: 'SMS', status: 'EXPIRED', sentAt: daysAgo(18), respondedAt: daysAgo(11) },
  });
  const huimin = await account({
    customerName: 'Hui Min Ong', branchId: downtown.id, bankerId: alice.id, status: 'EXPIRED', mobile: '98901234',
    consent: { channel: 'SMS', status: 'EXPIRED', sentAt: daysAgo(26), respondedAt: daysAgo(19) },
  });

  // ---------- M1: blocked contact change ----------
  const blockedReason = 'This number belongs to staff member Ben Lim. Staff contact details can never be put on a customer account.';
  await prisma.contactChangeRequest.create({
    data: {
      accountId: marcus.id, bankerId: ben.id, field: 'MOBILE', oldValue: '81234567', newValue: '90045566',
      status: 'BLOCKED', blockReason: blockedReason, createdAt: daysAgo(2), resolvedAt: daysAgo(2),
    },
  });

  // ---------- Alerts ----------
  const alert = (data) => prisma.conductAlert.create({ data: { status: 'OPEN', ...data } });

  await alert({
    type: 'BLOCKED_CONTACT_CHANGE', severity: 'HIGH', source: 'M1', createdAt: daysAgo(2),
    description: `Ben Lim tried to change Marcus Lee's mobile number to 9004 5566. Blocked: ${blockedReason} Customer notified on their existing mobile.`,
    branchId: riverside.id, bankerId: ben.id, accountId: marcus.id,
  });
  await alert({
    type: 'CONSENT_DECLINED', severity: 'MEDIUM', source: 'M2', createdAt: daysAgo(15),
    description: 'Account for Siti Rahman was declined at the consent gate — blocked, logged against banker and branch.',
    branchId: riverside.id, bankerId: ben.id, accountId: siti.id,
  });
  await alert({
    type: 'CONSENT_EXPIRED', severity: 'MEDIUM', source: 'M2', createdAt: daysAgo(11),
    description: 'Account for Ahmad Yusof was expired at the consent gate — blocked, logged against banker and branch.',
    branchId: riverside.id, bankerId: ben.id, accountId: ahmad.id,
  });
  await alert({
    type: 'CONSENT_EXPIRED', severity: 'MEDIUM', source: 'M2', createdAt: daysAgo(19), status: 'DISMISSED',
    description: 'Account for Hui Min Ong was expired at the consent gate — blocked, logged against banker and branch.',
    dismissReason: 'Genuine customer activity (false positive)', dismissedBy: 'Conduct Office Analyst', dismissedAt: daysAgo(17),
    branchId: downtown.id, bankerId: alice.id, accountId: huimin.id,
  });
  await alert({
    type: 'UNUSED_ACCOUNT_90D', severity: 'HIGH', source: 'M3', createdAt: daysAgo(5),
    description: 'Marcus Lee’s Savings Account (opened by Ben Lim) is unused after 90 days: the only activity was staff-initiated funding that was later reversed. Incentive lapsed and account flagged for review.',
    branchId: riverside.id, bankerId: ben.id, accountId: marcus.id,
  });

  // M4 branch pattern, already escalated into an overdue Conduct Office case.
  const pattern = await alert({
    type: 'BRANCH_PATTERN', severity: 'HIGH', source: 'M4', status: 'ESCALATED', createdAt: daysAgo(6),
    description: 'Riverside Branch: consent declines and unused accounts both more than 2x the network average over the last 30 days.',
    branchId: riverside.id,
  });
  await prisma.case.create({
    data: {
      alertId: pattern.id, branchId: riverside.id, level: 'CONDUCT_OFFICE', status: 'OVERDUE', deadlineAt: daysAgo(1),
      createdAt: daysAgo(6),
      events: {
        create: [
          { action: 'OPENED', actor: 'System (M4)', note: 'Opened from a branch-wide pattern alert. Branch has 5 days to respond.', timestamp: daysAgo(6) },
          { action: 'ESCALATED', actor: 'System (SLA sweep)', note: 'Branch did not respond within 5 days — auto-escalated to the Conduct Office (48h).', timestamp: daysAgo(3) },
        ],
      },
    },
  });

  // ---------- M5: speak-up reports ----------
  await prisma.report.create({
    data: {
      theme: 'SALES_PRESSURE', branchId: riverside.id, anonymous: true, trackingCode: 'SU-7K2M', createdAt: daysAgo(21),
      description: 'Our branch manager said anyone below 8 products per customer this month would lose their bonus. People are opening accounts customers did not ask for.',
    },
  });
  const named = await prisma.report.create({
    data: {
      theme: 'UNAUTHORISED_ACCOUNTS', branchId: riverside.id, anonymous: false, reporterId: daniel.id, trackingCode: 'SU-3QX8',
      createdAt: daysAgo(16), retaliationFlag: true,
      retaliationNote: 'Reporter’s rostered hours were cut by 30% eleven days after the report, by the branch management named in it.',
      description: 'I saw a colleague open a savings account for a walk-in customer who only came to update their address. The customer was not told.',
    },
  });
  await prisma.report.create({
    data: {
      theme: 'MISSELLING', branchId: downtown.id, anonymous: true, trackingCode: 'SU-9HD4', createdAt: daysAgo(40), status: 'REVIEWED',
      description: 'A credit card was pitched to an elderly customer as a "free savings upgrade".',
    },
  });
  await alert({
    type: 'RETALIATION_FLAGGED', severity: 'HIGH', source: 'M5', createdAt: daysAgo(5),
    description: `Speak-up report ${named.trackingCode}: the named reporter’s rostered hours were cut by 30% eleven days after reporting. Routed to the Audit Committee, bypassing branch management.`,
    branchId: riverside.id,
  });

  // ---------- M4 thresholds (governed by M7) ----------
  for (const [key, label, unit, value, description] of THRESHOLDS) {
    await prisma.threshold.create({ data: { key, label, unit, value, description } });
  }

  // ---------- M7: hash-chained control log ----------
  let prevHash = null;
  const logEntries = [
    ['Initial M4 detection thresholds approved for all branches', 'Head of Conduct Risk', 'Chief Risk Officer', daysAgo(60)],
    ['Accounts unused after 90 days: threshold lowered from 25% to 20%', 'Conduct Office Analyst', 'Second-Line Risk Officer', daysAgo(10)],
  ];
  for (const [change, changedBy, signedOffBy, createdAt] of logEntries) {
    const hash = entryHash({ prevHash, change, changedBy, signedOffBy, createdAt });
    await prisma.configChangeLog.create({ data: { change, changedBy, signedOffBy, prevHash, hash, createdAt } });
    prevHash = hash;
  }

  console.log('Seed complete: 3 branches, 4 bankers, 9 accounts, 8 alerts, 1 case, 3 speak-up reports, 5 thresholds, 2 log entries.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
