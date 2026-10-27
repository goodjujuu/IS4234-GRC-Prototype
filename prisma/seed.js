// Seeds synthetic, reproducible demo data — committed to the repo rather than
// synced live, so grading/demo runs are deterministic (mirrors the is4228
// reference project's approach to avoiding live external data dependencies).
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function daysAgo(n) {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000);
}
function hoursFromNow(n) {
  return new Date(Date.now() + n * 60 * 60 * 1000);
}
function fakeHash(input) {
  // Lightweight stand-in for a real hash chain (M7 tamper-evidence) — good
  // enough to demonstrate the concept without pulling in a crypto dependency.
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return 'sha256-demo-' + h.toString(16);
}

async function main() {
  console.log('Seeding...');

  // Clear existing data (idempotent re-seeding for local/demo use).
  await prisma.caseEvent.deleteMany();
  await prisma.contactChangeRequest.deleteMany();
  await prisma.case.deleteMany();
  await prisma.conductAlert.deleteMany();
  await prisma.consentRequest.deleteMany();
  await prisma.account.deleteMany();
  await prisma.report.deleteMany();
  await prisma.configChangeLog.deleteMany();
  await prisma.banker.deleteMany();
  await prisma.branch.deleteMany();

  const downtown = await prisma.branch.create({
    data: { name: 'Downtown Branch', region: 'Central' },
  });
  const riverside = await prisma.branch.create({
    data: { name: 'Riverside Branch', region: 'West' },
  });

  const alice = await prisma.banker.create({
    data: { name: 'Alice Tan', mobile: '90012233', branchId: downtown.id },
  });
  const ben = await prisma.banker.create({
    data: { name: 'Ben Lim', mobile: '90045566', branchId: riverside.id },
  });

  // 1) Healthy account: consented, active, incentive paid (M2 + M3 working as intended).
  const healthyAccount = await prisma.account.create({
    data: {
      customerName: 'Chandra Wijaya',
      branchId: downtown.id,
      bankerId: alice.id,
      mobile: '91234567',
      email: 'chandra.wijaya@gmail.com',
      pinStatus: 'SET_BY_CUSTOMER',
      pinSetAt: daysAgo(118),
      status: 'ACTIVE',
      incentiveStatus: 'PAID',
      activatedAt: daysAgo(120),
      lastUsedAt: daysAgo(3),
      consentRequest: {
        create: { channel: 'SMS', status: 'APPROVED', sentAt: daysAgo(125), respondedAt: daysAgo(124) },
      },
    },
  });

  // 2) Lapsed account: opened but unused for 90+ days — M3 flags, credit lapses.
  const lapsedAccount = await prisma.account.create({
    data: {
      customerName: 'Marcus Lee',
      branchId: riverside.id,
      bankerId: ben.id,
      mobile: '81234567',
      email: 'marcus.lee@outlook.com',
      status: 'ACTIVE',
      incentiveStatus: 'LAPSED',
      activatedAt: daysAgo(95),
      lastUsedAt: null,
      consentRequest: {
        create: { channel: 'SMS', status: 'APPROVED', sentAt: daysAgo(96), respondedAt: daysAgo(95) },
      },
    },
  });

  const unusedAlert = await prisma.conductAlert.create({
    data: {
      type: 'UNUSED_ACCOUNT_90D',
      severity: 'MEDIUM',
      source: 'M3',
      description: `Account for ${lapsedAccount.customerName} unused for 90+ days since activation — incentive credit lapsed, flagged for review.`,
      branchId: riverside.id,
      bankerId: ben.id,
      accountId: lapsedAccount.id,
      status: 'OPEN',
    },
  });

  // 3) Blocked contact-change attempt — M1 Contact-Integrity Guard stopping a
  //    banker putting their own number on a customer's account (the Wells
  //    Fargo pattern: customers never received the notifications).
  const blockedReason =
    'This number belongs to staff member Ben Lim. Staff contact details can never be put on a customer account.';
  await prisma.contactChangeRequest.create({
    data: {
      accountId: lapsedAccount.id,
      bankerId: ben.id,
      field: 'MOBILE',
      oldValue: '81234567',
      newValue: '90045566',
      status: 'BLOCKED',
      blockReason: blockedReason,
      createdAt: daysAgo(2),
      resolvedAt: daysAgo(2),
    },
  });
  await prisma.conductAlert.create({
    data: {
      type: 'BLOCKED_CONTACT_CHANGE',
      severity: 'HIGH',
      source: 'M1',
      description: `Ben Lim tried to change Marcus Lee's mobile number to 9004 5566. Blocked: ${blockedReason} Customer notified on their existing mobile.`,
      branchId: riverside.id,
      bankerId: ben.id,
      accountId: lapsedAccount.id,
      status: 'OPEN',
      createdAt: daysAgo(2),
    },
  });

  // 4) Branch-wide pattern — M4 Conduct Analytics, already escalated into an
  //    overdue Case so the Cases/Board views have something to show deadlines.
  const patternAlert = await prisma.conductAlert.create({
    data: {
      type: 'BRANCH_WIDE_PATTERN',
      severity: 'HIGH',
      source: 'M4',
      description:
        'Riverside Branch: consent-decline rate (38%) and unused-account rate (22%) both more than 2x the network average over trailing 30 days.',
      branchId: riverside.id,
      bankerId: ben.id,
      status: 'ESCALATED',
    },
  });

  const overdueCase = await prisma.case.create({
    data: {
      alertId: patternAlert.id,
      branchId: riverside.id,
      bankerId: ben.id,
      level: 'CONDUCT_OFFICE',
      status: 'OVERDUE',
      deadlineAt: daysAgo(1), // already past due, to demonstrate M6 overdue auto-escalation framing
      events: {
        create: [
          { action: 'OPENED', actor: 'System (M4)', note: 'Auto-opened from branch-wide pattern alert.', timestamp: daysAgo(6) },
          { action: 'ESCALATED', actor: 'Branch Manager (Riverside)', note: 'Escalated to Conduct Office — unresolved after 5-day branch window.', timestamp: daysAgo(1) },
        ],
      },
    },
  });

  // 5) Speak-Up Channel reports (M5) — one routine, one with retaliation flagged.
  //    Per the module flow, a retaliation-flagged report also surfaces as a
  //    conduct alert so it visibly feeds into M4 Conduct Analytics, not just
  //    a standalone complaints count.
  await prisma.report.create({
    data: {
      theme: 'SALES_PRESSURE',
      description: 'Anonymous report: branch-wide pressure to hit cross-sell targets regardless of customer need.',
      status: 'OPEN',
      retaliationFlag: false,
    },
  });

  const retaliationReport = await prisma.report.create({
    data: {
      theme: 'RETALIATION',
      description: 'Anonymous report: staff member reports being threatened with reduced hours after raising concerns about unauthorized account openings.',
      status: 'OPEN',
      retaliationFlag: true,
    },
  });

  await prisma.conductAlert.create({
    data: {
      type: 'RETALIATION_FLAGGED',
      severity: 'HIGH',
      source: 'M5',
      description: `Speak-Up report #${retaliationReport.id.slice(0, 8)} auto-flagged for retaliation — routed directly to Audit Committee, bypassing branch/manager chain.`,
      branchId: riverside.id,
      status: 'OPEN',
    },
  });

  // 6) M7 — a governed threshold change, hash-chained and signed off by second line.
  const changeText = 'Raised unused-account review threshold from 60 to 90 days';
  await prisma.configChangeLog.create({
    data: {
      change: changeText,
      changedBy: 'Conduct Office Analyst',
      signedOffBy: 'Second-Line Risk Officer',
      hash: fakeHash(changeText + Date.now()),
    },
  });

  console.log('Seed complete:', {
    branches: 2,
    bankers: 2,
    accounts: [healthyAccount.customerName, lapsedAccount.customerName],
    alerts: 4,
    cases: 1,
    overdueCaseId: overdueCase.id,
    reports: 2,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
