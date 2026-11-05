// Seeds synthetic, reproducible demo data. A fixed clock and a fixed random seed mean
// every run produces the same numbers, so the demo scenario in CLAUDE.md always works.
// All people, branches and customers are fictional.
//
// The story: Branch 12 Harbourview had its weekly target raised twice, most recently last
// month. Unused accounts nearly doubled, most staff are missing the target, and an
// overnight dismissal and new complaints moved the branch to High.
const { PrismaClient } = require('@prisma/client');
const { DAY, DEFAULT_CONFIG, computeRiskTable, configMap } = require('../lib/scoring');
const { appendLogEntry } = require('../lib/hashChain');
const { hashPassword } = require('../lib/password');
const { buildBriefingFacts, simulatedSummary } = require('../lib/briefing');
const { openCase, pressureAt, recordDismissal, reporterSeal, runScoring } = require('../lib/engine');

const prisma = new PrismaClient();

const CLOCK = new Date('2026-11-09T00:30:00Z'); // Monday 9 November 2026, 8:30 am Singapore time
const LOAD = new Date('2026-11-08T22:00:00Z'); // the overnight data load, 6:00 am Singapore time
const HISTORY_WEEKS = 30;
const TARGET_RAISED_1 = new Date(LOAD.getTime() - 148 * DAY);
const TARGET_RAISED_2 = new Date(LOAD.getTime() - 32 * DAY);
const daysBefore = (n) => new Date(LOAD.getTime() - n * DAY);

function mulberry32(seed) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
// Each employee draws from their own stream, so tuning one person leaves the rest alone.
let rand = mulberry32(4234);
const reseed = (name, salt) => {
  rand = mulberry32([...`${name}:${salt}`].reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 4234));
};
const between = (lo, hi) => lo + rand() * (hi - lo);
const pick = (list) => list[Math.floor(rand() * list.length)];

const PRODUCTS = ['Savings Account', 'Current Account', 'Credit Card', 'Personal Line of Credit', 'Debit Card', 'Online Bill Pay'];
const SERVICE_COMPLAINTS = ['Long wait at the counter', 'Statement arrived late', 'Fee explained poorly', 'Card delivery delayed'];
const DNA_COMPLAINTS = ['Customer says they never asked for this account', 'Customer did not recognise the account on a statement', 'Customer did not authorise this card'];

// severity 0 is ordinary behaviour. Higher values add the pattern from the case.
const BRANCHES = [
  { code: 3, name: 'Eastgate', region: 'East', target: 5, manager: 'Clara Whitfield', staff: [['Tomas Reyes'], ['Hana Sorensen'], ['Felix Amadi'], ['Ruth Delacroix'], ['Jonah Pereira'], ['Mei Tanaka']] },
  { code: 7, name: 'Riverside', region: 'Central', target: 5, manager: 'Victor Nakamura', staff: [['Owen Castell', 0.35], ['Lena Fischer'], ['Arjun Bose'], ['Paula Ibarra'], ['Noah Ekström'], ['Sana Qureshi']] },
  { code: 9, name: 'Lakeside', region: 'West', target: 5, manager: 'Grace Mbeki', staff: [['Elliot Vance'], ['Tara Novak'], ['Hugo Marchetti'], ['Zofia Kowal'], ['Kofi Boateng'], ['Anika Rao']] },
  {
    code: 12, name: 'Harbourview', region: 'South', target: 12, manager: 'Daniel Okafor', hot: true,
    staff: [['Maya Lindqvist', 0.9, 8], ['Ravi Menon', 0, 7], ['Isla Brennan', 0.7, 8], ['Marco Silva', 0.65, 8], ['Yuki Hayashi', 0.55, 7.5], ['Dara Quinn', 0.42, 8.5], ['Sami Haddad', 0.5, 7.5], ['Nora Adeyemi', 0.45, 8], ['Ben Larsen', 0.4, 14], ['Chloe Vargas', 0.35, 14]],
  },
  { code: 15, name: 'Northfield', region: 'North', target: 5, manager: 'Peter Lindholm', staff: [['Ingrid Solberg', 0.3], ['Caleb Stone'], ['Farah Aziz'], ['Mateo Ruiz'], ['Olivia Grant'], ['Rohan Pillai']] },
  { code: 21, name: 'Southbank', region: 'South', target: 5, manager: 'Alice Moreau', staff: [['Nadia Hassan'], ['Simon Keller'], ['Priya Nair'], ['Lucas Meyer'], ['Amara Diallo'], ['Eli Rosen']] },
];

const LOGINS = [
  { email: 'maya.lindqvist@conductguard.demo', name: 'Maya Lindqvist', title: 'Personal Banker, Branch 12', role: 'EMPLOYEE', employee: 'Maya Lindqvist' },
  { email: 'mei.tanaka@conductguard.demo', name: 'Mei Tanaka', title: 'Personal Banker, Branch 3', role: 'EMPLOYEE', employee: 'Mei Tanaka' },
  { email: 'daniel.okafor@conductguard.demo', name: 'Daniel Okafor', title: 'Branch Manager, Branch 12', role: 'TEAM_LEAD', employee: 'Daniel Okafor', branch: 12 },
  { email: 'victor.nakamura@conductguard.demo', name: 'Victor Nakamura', title: 'Branch Manager, Branch 7', role: 'TEAM_LEAD', employee: 'Victor Nakamura', branch: 7 },
  { email: 'priya.raman@conductguard.demo', name: 'Priya Raman', title: 'Conduct Risk Analyst', role: 'CONDUCT_RISK' },
  { email: 'helen.cho@conductguard.demo', name: 'Helen Cho', title: 'Head of Conduct Risk', role: 'CONDUCT_RISK' },
  { email: 'rosalind.keane@conductguard.demo', name: 'Rosalind Keane', title: 'Chief Risk Officer', role: 'CHIEF_RISK_OFFICER' },
  { email: 'samuel.ito@conductguard.demo', name: 'Samuel Ito', title: 'Internal Auditor', role: 'INTERNAL_AUDIT' },
  { email: 'margaret.flynn@conductguard.demo', name: 'Margaret Flynn', title: 'Audit Committee Chair', role: 'AUDIT_COMMITTEE' },
];
const DEMO_PASSWORD = 'demo1234';

// Share of the pattern present at a given age: none before the first target rise,
// then growing towards today.
function ramp(daysAgo) {
  if (daysAgo > 148) return 0;
  return 0.45 + (0.55 * (148 - daysAgo)) / 148;
}

function weeklyRate(employee, branch, daysAgo) {
  if (!branch.hot || daysAgo > 148) return between(4.6, 6.4);
  if (daysAgo > 32) return between(6.5, 8.5);
  return employee.rate + between(-0.6, 0.6);
}

let accountSeq = 100000;
function buildAccount(employee, branch, openedAt, customerRef) {
  const daysAgo = (LOAD - openedAt) / DAY;
  const pattern = employee.severity * ramp(daysAgo);
  const usedRoll = rand();
  const unused = usedRoll < 0.1 + 0.52 * pattern;
  const transfer = rand() < 0.05 + 0.15 * pattern;
  const closes = rand() < 0.04 + 0.1 * pattern;
  const contact = rand() < 0.01 + 0.05 * pattern;
  const clip = (d) => (d <= LOAD ? d : null);
  accountSeq += 1;
  return {
    ref: `ACC-${accountSeq}`,
    customerRef,
    product: pick(PRODUCTS),
    employeeId: employee.id,
    branchId: branch.id,
    openedAt,
    firstGenuineActivityAt: unused ? null : clip(new Date(openedAt.getTime() + between(3, 60) * DAY)),
    fundingSource: transfer ? 'INTERNAL_TRANSFER_ONLY' : unused && rand() < 0.5 ? 'NONE' : 'EXTERNAL',
    closedAt: closes ? clip(new Date(openedAt.getTime() + between(20, 58) * DAY)) : null,
    contactChangeAt: contact ? clip(new Date(openedAt.getTime() + between(-2, 10) * DAY)) : null,
  };
}

function monthEndShift(openedAt) {
  const lastDay = new Date(Date.UTC(openedAt.getUTCFullYear(), openedAt.getUTCMonth() + 1, 0)).getUTCDate();
  const shifted = new Date(openedAt);
  shifted.setUTCDate(lastDay - Math.floor(rand() * 3));
  return (LOAD - shifted) / DAY > 28 ? shifted : openedAt; // stays out of the 4-week target check
}

function generateActivity(employee, branch) {
  reseed(employee.name, 'activity');
  const accounts = [];
  for (let w = HISTORY_WEEKS - 1; w >= 0; w -= 1) {
    const weekStart = LOAD.getTime() - (w + 1) * 7 * DAY;
    const count = Math.round(weeklyRate(employee, branch, (w + 0.5) * 7));
    for (let i = 0; i < count; i += 1) {
      let openedAt = new Date(weekStart + rand() * 7 * DAY);
      const daysAgo = (LOAD - openedAt) / DAY;
      // Branch 12 only: sales bunch at month end once the target is raised, in the
      // weeks before the rolling 4-week target check.
      if (branch.hot && daysAgo < 148 && daysAgo > 28 && rand() < 0.3) openedAt = monthEndShift(openedAt);
      const customerRef = `CUST-${String(Math.floor(rand() * 90000) + 10000)}`;
      accounts.push(buildAccount(employee, branch, openedAt, customerRef));
      if (rand() < 0.04 + 0.12 * employee.severity * ramp(daysAgo)) {
        accounts.push(buildAccount(employee, branch, new Date(openedAt.getTime() + 600000), customerRef));
      }
    }
  }
  return accounts;
}

function generateComplaints(accounts, employee, branch, overnightDna) {
  reseed(employee.name, 'complaints');
  const complaints = [];
  const complaint = (account, category, summary, receivedAt) => ({ category, summary, receivedAt, accountId: account.id, employeeId: employee.id, branchId: branch.id });
  for (const a of accounts) {
    const daysAgo = (LOAD - a.openedAt) / DAY;
    const receivedAt = new Date(a.openedAt.getTime() + between(5, 25) * DAY);
    if (receivedAt > LOAD) continue;
    if (rand() < 0.008) complaints.push(complaint(a, 'SERVICE', pick(SERVICE_COMPLAINTS), receivedAt));
    if (rand() < 0.002 + 0.007 * employee.severity * ramp(daysAgo)) complaints.push(complaint(a, 'DID_NOT_AUTHORISE', pick(DNA_COMPLAINTS), receivedAt));
  }
  // The overnight load's complaints are what tip Branch 12 from Medium to High.
  const recent = accounts.filter((a) => (LOAD - a.openedAt) / DAY < 40);
  for (let i = 0; i < overnightDna && recent.length; i += 1) {
    complaints.push(complaint(pick(recent), 'DID_NOT_AUTHORISE', pick(DNA_COMPLAINTS), new Date(LOAD.getTime() - between(1, 20) * 3600000)));
  }
  return complaints;
}

async function wipe() {
  await prisma.notification.deleteMany();
  await prisma.caseEvent.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.case.deleteMany();
  await prisma.riskScore.deleteMany();
  await prisma.complaint.deleteMany();
  await prisma.accountRecord.deleteMany();
  await prisma.targetChange.deleteMany();
  await prisma.speakUpReport.deleteMany();
  await prisma.dismissal.deleteMany();
  await prisma.user.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.scoringConfig.deleteMany();
  await prisma.thresholdChangeRequest.deleteMany();
  await prisma.configChangeLog.deleteMany();
  await prisma.watcherAlert.deleteMany();
  await prisma.briefing.deleteMany();
  await prisma.demoClock.deleteMany();
}

async function createInBatches(model, rows, size = 1000) {
  for (let i = 0; i < rows.length; i += size) await model.createMany({ data: rows.slice(i, i + size) });
}

// Closed review history, so the effectiveness metrics and the manager response times
// have something real to measure. Branch 12's manager is slow, one Branch 9 reviewer
// clears six cases inside an hour, the rest are ordinary. A past High case for one Branch
// 12 employee means today's flag is a second High within six months.
async function seedClosedCases(employeesByBranch, branches) {
  reseed('history', 'cases');
  const closed = [];
  const plan = [
    [3, 'MEDIUM', 41, 18, 70, 'COACHING'], [3, 'MEDIUM', 33, 9, 60, 'CLEARED'], [7, 'MEDIUM', 52, 26, 90, 'COACHING'], [7, 'HIGH', 28, 6, 40, 'INVESTIGATION'],
    ...[0.1, 0.2, 0.3, 0.45, 0.6, 0.75].map((h) => [9, 'MEDIUM', 19, h - 0.05, h, 'CLEARED']),
    [12, 'MEDIUM', 58, 118, 150, 'COACHING'], [12, 'MEDIUM', 47, 104, 175, 'COACHING'], [12, 'MEDIUM', 36, 96, 160, 'CLEARED'], [12, 'HIGH', 24, 30, 62, 'COACHING', 'Isla Brennan'],
    [15, 'MEDIUM', 44, 22, 80, 'CLEARED'], [15, 'HIGH', 21, 8, 44, 'COACHING'], [21, 'MEDIUM', 40, 15, 64, 'COACHING'], [21, 'MEDIUM', 26, 31, 96, 'CLEARED'], [21, 'HIGH', 16, 12, 39, 'INVESTIGATION'],
  ];
  const leads = { 3: 'Clara Whitfield', 7: 'Victor Nakamura', 9: 'Grace Mbeki', 12: 'Daniel Okafor', 15: 'Peter Lindholm', 21: 'Alice Moreau' };
  const planNames = plan.map((p) => p[6]).filter(Boolean);
  for (const [code, riskLevel, ageDays, actHours, closeHours, outcome, name] of plan) {
    const branch = branches.find((b) => b.code === code);
    const staff = employeesByBranch.get(branch.id).filter((e) => !e.isManager);
    const employee = name ? staff.find((e) => e.name === name) : pick(staff.filter((e) => !planNames.includes(e.name)));
    const openedAt = daysBefore(ageDays);
    const reviewer = riskLevel === 'HIGH' ? 'Priya Raman' : leads[code];
    const firstActionAt = new Date(openedAt.getTime() + actHours * 3600000);
    const closedAt = new Date(openedAt.getTime() + closeHours * 3600000);
    const c = await openCase(prisma, {
      kind: 'EMPLOYEE_FLAG',
      title: `${riskLevel === 'HIGH' ? 'High' : 'Medium'} risk flag: ${employee.name}`,
      summary: `Scored ${riskLevel === 'HIGH' ? 72 : 48} against peers in the same role and branch.`,
      riskLevel,
      tier: riskLevel === 'HIGH' ? 'CONDUCT_RISK' : 'TEAM_LEAD',
      employeeId: employee.id,
      branchId: branch.id,
      now: openedAt,
      assignee: reviewer,
    });
    const reason = { COACHING: 'Reviewed the accounts with the employee and agreed coaching.', CLEARED: 'Activity was reviewed and has a genuine explanation.', INVESTIGATION: 'Pattern needs a formal investigation.' }[outcome];
    await prisma.case.update({
      where: { id: c.id },
      data: {
        status: 'CLOSED', outcome, closeReason: reason, firstActionAt, closedAt, inCommitteeSummary: false,
        events: {
          create: [
            { action: 'REVIEW_STARTED', actor: reviewer, timestamp: firstActionAt },
            { action: 'CLOSED', actor: reviewer, note: `${outcome}. ${reason}`, timestamp: closedAt },
          ],
        },
      },
    });
    closed.push({ ...c, employee, closedAt, outcome, reviewer });
  }

  // Past disputes. The reviewer decides, and an upheld dispute is a false alarm that
  // feeds later proposals to adjust weights.
  const disputes = [
    [1, 'contact', 'The customer asked for this change in person and signed the form.', 'The signed form is attached to the file.', 'UPHELD', 'Form on file confirms the customer requested it.'],
    [15, 'sameDay', 'These were a family opening accounts together during one appointment.', 'Appointment notes from that day.', 'UPHELD', 'Appointment notes support this.'],
    [9, 'unused', 'The customer told me they were saving this account for later.', null, 'REJECTED', 'No evidence of customer intent on file.'],
    [18, 'transfer', 'The customer chose to move their own money across.', null, 'REJECTED', 'The pattern repeats across many customers.'],
  ];
  for (const [index, metricKey, statement, evidence, status, decisionNote] of disputes) {
    const c = closed[index];
    const createdAt = new Date(c.openedAt.getTime() + 2 * 3600000);
    await prisma.dispute.create({
      data: { caseId: c.id, employeeId: c.employee.id, metricKey, statement, evidence, status, decisionNote, decidedBy: c.reviewer, createdAt, decidedAt: c.closedAt },
    });
    await prisma.caseEvent.createMany({
      data: [
        { caseId: c.id, action: 'DISPUTED', actor: c.employee.name, note: statement, timestamp: createdAt },
        { caseId: c.id, action: 'DISPUTE_DECIDED', actor: c.reviewer, note: `${status}. ${decisionNote}`, timestamp: c.closedAt },
      ],
    });
    if (status === 'UPHELD') await prisma.case.update({ where: { id: c.id }, data: { outcome: 'CLEARED', closeReason: `Dispute upheld. ${decisionNote}` } });
  }
}

async function seedChangeHistory() {
  await appendLogEntry(prisma, {
    event: 'SEEDED', change: 'Baseline weights and thresholds approved at platform launch.', changedBy: 'Helen Cho', signedOffBy: 'Rosalind Keane', createdAt: daysBefore(240),
  });
  const label = (key) => DEFAULT_CONFIG.find(([k]) => k === key)[1];
  const proposals = [
    ['weight_unused', 20, 25, 'False alarm data showed unused accounts were the most reliable signal.', 'Priya Raman', 11, 13, 'APPROVED', 'Raises detection, supported by the data.', 95],
    ['weight_contact', 10, 5, 'Several contact change flags were overturned in disputes.', 'Helen Cho', 12, 11, 'REJECTED', 'Two false alarms are not enough evidence to reduce this weight.', 60],
  ];
  for (const [configKey, oldValue, newValue, reason, requestedBy, flagsBefore, flagsAfter, status, reviewNote, age] of proposals) {
    const createdAt = daysBefore(age);
    const reviewedAt = new Date(createdAt.getTime() + 26 * 3600000);
    await prisma.thresholdChangeRequest.create({ data: { configKey, oldValue, newValue, reason, requestedBy, requesterRole: 'CONDUCT_RISK', flagsBefore, flagsAfter, status, reviewedBy: 'Rosalind Keane', reviewNote, createdAt, reviewedAt } });
    await appendLogEntry(prisma, { event: 'PROPOSED', change: `${label(configKey)} from ${oldValue} to ${newValue} proposed. ${reason}`, changedBy: requestedBy, createdAt });
    await appendLogEntry(prisma, { event: status, change: `${label(configKey)} from ${oldValue} to ${newValue} ${status.toLowerCase()}. ${reviewNote}`, changedBy: requestedBy, signedOffBy: 'Rosalind Keane', createdAt: reviewedAt });
  }
  // An earlier blocked attempt by a branch manager.
  const blockedAt = daysBefore(37);
  await prisma.thresholdChangeRequest.create({
    data: { configKey: 'level_high', oldValue: 70, newValue: 80, reason: 'Too many High reviews for the current team size.', requestedBy: 'Victor Nakamura', requesterRole: 'TEAM_LEAD', flagsBefore: 12, flagsAfter: 9, status: 'BLOCKED', createdAt: blockedAt },
  });
  await appendLogEntry(prisma, { event: 'BLOCKED', change: `${label('level_high')} from 70 to 80 blocked. Branch managers cannot change thresholds. Too many High reviews for the current team size.`, changedBy: 'Victor Nakamura', createdAt: blockedAt });
}

async function main() {
  console.log('Seeding...');
  await wipe();
  await prisma.demoClock.create({ data: { id: 1, now: CLOCK } });
  await prisma.scoringConfig.createMany({
    data: DEFAULT_CONFIG.map(([key, label, group, value, unit, description]) => ({ key, label, group, value, unit, description })),
  });
  const config = configMap(await prisma.scoringConfig.findMany());

  // Branches, people and account activity
  const branches = [];
  const employeesByBranch = new Map();
  const employeeRows = [];
  for (const b of BRANCHES) {
    // Branch 12's target started the same as everyone else's.
    const branch = await prisma.branch.create({ data: { code: b.code, name: b.name, region: b.region, weeklyTarget: b.target } });
    branches.push(branch);
    const staff = [];
    const manager = await prisma.employee.create({ data: { name: b.manager, position: 'Branch Manager', isManager: true, branchId: branch.id } });
    staff.push(manager);
    for (const [name, severity = 0, rate = 5.5] of b.staff) {
      const e = await prisma.employee.create({ data: { name, position: 'Personal Banker', branchId: branch.id } });
      staff.push({ ...e, severity, rate });
      employeeRows.push({ employee: { ...e, severity, rate }, blueprint: b, branch });
    }
    employeesByBranch.set(branch.id, staff);
  }

  const accounts = [];
  for (const { employee, blueprint } of employeeRows) {
    accounts.push(...generateActivity(employee, { ...blueprint, id: employee.branchId }));
  }
  await createInBatches(prisma.accountRecord, accounts);
  const storedAccounts = await prisma.accountRecord.findMany();

  // Complaints are generated against stored accounts because they need the real ids.
  const accountsByEmployee = new Map();
  for (const a of storedAccounts) {
    if (!accountsByEmployee.has(a.employeeId)) accountsByEmployee.set(a.employeeId, []);
    accountsByEmployee.get(a.employeeId).push(a);
  }
  accountsByEmployee.forEach((list) => list.sort((x, y) => x.ref.localeCompare(y.ref)));
  const complaints = [];
  for (const { employee, blueprint } of employeeRows) {
    const list = accountsByEmployee.get(employee.id) || [];
    const overnight = blueprint.hot && employee.severity > 0.3 ? Math.round(employee.severity * 5) : 0;
    complaints.push(...generateComplaints(list, employee, { id: employee.branchId }, overnight));
  }
  await createInBatches(prisma.complaint, complaints);

  const b12 = branches.find((b) => b.code === 12);
  await prisma.targetChange.createMany({
    data: [
      { branchId: b12.id, oldTarget: 5, newTarget: 8, effectiveAt: TARGET_RAISED_1, setBy: 'Regional Sales Director' },
      { branchId: b12.id, oldTarget: 8, newTarget: 12, effectiveAt: TARGET_RAISED_2, setBy: 'Regional Sales Director' },
    ],
  });

  // Anonymous reports. Ravi Menon's carries a seal, so dismissing Ravi fires the retaliation guard.
  const ravi = employeeRows.find((r) => r.employee.name === 'Ravi Menon').employee;
  await prisma.speakUpReport.createMany({
    data: [
      { trackingCode: 'SU-4K7P', theme: 'TARGET_PRESSURE', message: 'We were told to reach the new target or our roles would be reviewed. Most of us cannot reach it honestly.', reporterSeal: reporterSeal(ravi.id), branchId: b12.id, createdAt: daysBefore(21) },
      { trackingCode: 'SU-9TQ2', theme: 'TARGET_PRESSURE', message: 'Daily calls ask each of us why we are behind. People are opening accounts to make the calls stop.', branchId: b12.id, createdAt: daysBefore(38) },
      { trackingCode: 'SU-2MX8', theme: 'INSTRUCTED_MISCONDUCT', message: 'A colleague was told to move money between a customer\'s own accounts so a new account looks funded.', branchId: b12.id, createdAt: daysBefore(55) },
      { trackingCode: 'SU-6HB3', theme: 'OTHER', message: 'Our team huddle felt rushed this quarter, but I have no specific concern to report.', branchId: branches.find((b) => b.code === 3).id, createdAt: daysBefore(70) },
    ],
  });

  // Users
  const everyone = [...employeesByBranch.values()].flat();
  for (const l of LOGINS) {
    const employee = l.employee ? everyone.find((e) => e.name === l.employee) : null;
    await prisma.user.create({
      data: {
        email: l.email, passwordHash: hashPassword(DEMO_PASSWORD), name: l.name, title: l.title, role: l.role,
        employeeId: employee?.id, branchId: l.branch ? branches.find((b) => b.code === l.branch).id : null,
      },
    });
  }

  await seedChangeHistory();
  await seedClosedCases(employeesByBranch, branches);

  // Past dismissals, with their branch reviews already closed. These employees have
  // left, so they carry no account activity into today's peer groups.
  const pastDismissals = [
    [12, 'Tessa Lund', 'Opened accounts without customer authorisation.', 96], [12, 'Gareth Pyke', 'Falsified contact details on customer accounts.', 61],
    [12, 'Ivo Marek', 'Opened accounts without customer authorisation.', 0.4], [7, 'Selma Roy', 'Simulated funding on new accounts.', 83],
    [15, 'Dean Abara', 'Opened accounts without customer authorisation.', 44],
  ];
  for (const [code, name, reason, age] of pastDismissals) {
    const branch = branches.find((b) => b.code === code);
    const employee = await prisma.employee.create({ data: { name, position: 'Personal Banker', branchId: branch.id } });
    await recordDismissal(prisma, { employee, reason, now: daysBefore(age), openReview: age < 7 });
  }

  // Past warning signs from the Branch 9 reviews and the blocked attempt above
  await prisma.watcherAlert.createMany({
    data: [
      {
        type: 'FAST_REVIEWS', severity: 'MEDIUM', title: 'Unusually fast reviews at Branch 9',
        detail: 'Grace Mbeki cleared six cases within one hour. Flags may have been dismissed without real checks.', createdAt: daysBefore(19),
      },
      {
        type: 'THRESHOLD_CHANGE', severity: 'HIGH', title: 'Branch manager tried to change high risk threshold', status: 'ACKNOWLEDGED', acknowledgedBy: 'Samuel Ito',
        detail: 'Victor Nakamura tried to raise the high risk threshold from 70 to 80. The attempt was blocked.', createdAt: daysBefore(37),
      },
    ],
  });

  // Score history: the same engine, replayed at past dates, so trends are real.
  const employees = await prisma.employee.findMany();
  const storedComplaints = await prisma.complaint.findMany();
  const runs = [8, 7, 6, 5, 4, 3, 2].map((w) => daysBefore(w * 7)).concat(daysBefore(1));
  for (const asOf of runs) {
    const table = computeRiskTable({
      employees, accounts: storedAccounts, complaints: storedComplaints.filter((c) => c.receivedAt <= asOf), config, asOf,
    });
    await prisma.riskScore.createMany({
      data: table.map((r) => ({ employeeId: r.employeeId, branchId: r.branchId, asOf, score: r.score, level: r.level, metrics: r.metrics })),
    });
  }

  // Today's overnight run. This is what opens the live cases and notifications.
  const { pressure, table } = await runScoring(prisma, { now: LOAD });

  const previousPressure = await pressureAt(prisma, daysBefore(1), config);
  const facts = await buildBriefingFacts(prisma, { now: LOAD, pressure, previousPressure });
  const draft = simulatedSummary(facts);
  await prisma.briefing.create({ data: { asOf: LOAD, facts, draft, summary: draft, source: 'SIMULATED', createdAt: LOAD } });

  const levels = table.reduce((n, r) => ({ ...n, [r.level]: (n[r.level] || 0) + 1 }), {});
  console.log(
    `Seed complete: ${branches.length} branches, ${employees.length} employees, ${storedAccounts.length} accounts, ${storedComplaints.length} complaints, ` +
      `${await prisma.case.count()} cases, ${LOGINS.length} demo logins. Levels today: ${JSON.stringify(levels)}.`,
  );
  if (process.env.SEED_VERBOSE) {
    const name = new Map(employees.map((e) => [e.id, e.name]));
    const prior = await prisma.riskScore.findMany({ where: { asOf: daysBefore(1) } });
    for (const b of branches) {
      const row = table.filter((r) => r.branchId === b.id);
      const p = pressure.find((x) => x.branchId === b.id);
      const q = previousPressure.find((x) => x.branchId === b.id);
      const before = prior.filter((r) => r.branchId === b.id && r.level === 'HIGH').length;
      console.log(`Branch ${b.code}: ${q.rating} ${q.index} (${before} High) -> ${p.rating} ${p.index} (${p.high} High), missing ${p.missing}/${p.staff}, ` + row.map((r) => `${name.get(r.employeeId).split(' ')[0]} ${r.score}${r.level[0]}`).join(' '));
    }
    console.log(JSON.stringify(facts.cause), '\n', simulatedSummary(facts));
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
