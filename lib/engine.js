// The scoring, alerting and escalation steps of the platform. CommonJS so that
// prisma/seed.js replays the same engine as the running app. Every function takes the
// Prisma client rather than importing one.
const { createHmac } = require('crypto');
const { DAY, DEFAULT_CONFIG, computeRiskTable, configMap, flaggedAccounts } = require('./scoring');
const { computePressure } = require('./pressure');

const SEAL_SECRET = process.env.SESSION_SECRET || 'conductguard-demo-secret';
const SYSTEM = 'System (scoring engine)';
const HOUR = 3600000;
const REPEAT_WINDOW_DAYS = 182; // about six months

// --- Demo clock. A fixed clock keeps windows and deadlines reproducible. Each action
// ticks it forward slightly so the audit trail keeps a real order.
async function getNow(prisma) {
  const row = await prisma.demoClock.findUnique({ where: { id: 1 } });
  return row.now;
}
async function tick(prisma, minutes = 2) {
  const now = await getNow(prisma);
  const next = new Date(now.getTime() + minutes * 60000);
  await prisma.demoClock.update({ where: { id: 1 }, data: { now: next } });
  return next;
}

function addWorkingDays(date, days) {
  const d = new Date(date);
  let left = days;
  while (left > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    if (![0, 6].includes(d.getUTCDay())) left -= 1;
  }
  return d;
}

function reporterSeal(employeeId) {
  return createHmac('sha256', SEAL_SECRET).update(employeeId).digest('hex');
}

async function loadConfig(prisma) {
  return configMap(await prisma.scoringConfig.findMany());
}

// --- Notifications and warning signs
async function notifyUser(prisma, userId, { title, body, link, createdAt }) {
  return prisma.notification.create({ data: { userId, title, body, link, createdAt } });
}
async function notifyRole(prisma, role, { title, body, link, createdAt }) {
  const users = await prisma.user.findMany({ where: { role }, select: { id: true } });
  if (users.length) await prisma.notification.createMany({ data: users.map((u) => ({ userId: u.id, title, body, link, createdAt })) });
}

// Warning signs go to internal audit, not to the business line involved.
async function raiseWatcherAlert(prisma, { type, severity, title, detail, createdAt }) {
  const alert = await prisma.watcherAlert.create({ data: { type, severity, title, detail, createdAt } });
  await notifyRole(prisma, 'INTERNAL_AUDIT', { title: `Warning sign: ${title}`, body: detail, link: '/watchers', createdAt });
  return alert;
}

// Replays approved changes over the launch baseline. Any live value that differs was
// changed outside the approval route, so skipped approvals are measured.
function findUnapprovedChanges(config, requests) {
  const expected = Object.fromEntries(DEFAULT_CONFIG.map(([key, , , value]) => [key, value]));
  const approved = requests.filter((r) => r.status === 'APPROVED').sort((a, b) => a.reviewedAt - b.reviewedAt);
  for (const r of approved) expected[r.configKey] = r.newValue;
  return config.filter((c) => expected[c.key] !== c.value).map((c) => ({ key: c.key, label: c.label, expected: expected[c.key], actual: c.value }));
}

async function checkUnapprovedChanges(prisma, now) {
  const [config, requests] = await Promise.all([prisma.scoringConfig.findMany(), prisma.thresholdChangeRequest.findMany()]);
  const found = findUnapprovedChanges(config, requests);
  for (const u of found) {
    const title = `Unapproved change to ${u.label.toLowerCase()}`;
    if (await prisma.watcherAlert.findFirst({ where: { type: 'UNAPPROVED_CHANGE', title } })) continue;
    await raiseWatcherAlert(prisma, {
      type: 'UNAPPROVED_CHANGE',
      severity: 'HIGH',
      title,
      detail: `${u.label} is ${u.actual}, but the approved value is ${u.expected}. This skipped approval and breaches the two-person rule.`,
      createdAt: now,
    });
  }
  return found;
}

// --- Cases. Every status or level change appends a CaseEvent.
async function nextCaseRef(prisma) {
  const count = await prisma.case.count();
  return `CASE-${1001 + count}`;
}

// Every case goes to a named reviewer.
async function namedReviewer(prisma, tier, branchId) {
  if (tier === 'TEAM_LEAD') {
    const manager = await prisma.employee.findFirst({ where: { branchId, isManager: true } });
    return manager?.name || null;
  }
  const user = await prisma.user.findFirst({ where: { role: tier }, orderBy: { email: 'desc' } });
  return user?.name || null;
}

function defaultDeadline(kind, tier, now) {
  if (kind === 'RETALIATION_GUARD') return new Date(now.getTime() + 24 * HOUR); // shown as Immediate
  if (kind === 'BRANCH_PRESSURE' || kind === 'DISMISSAL_REVIEW' || tier === 'TEAM_LEAD') return addWorkingDays(now, 5);
  return new Date(now.getTime() + 48 * HOUR);
}

async function openCase(prisma, { kind, title, summary, riskLevel, tier, employeeId, branchId, evidence, inCommitteeSummary, now, deadlineAt, actor = SYSTEM, note, assignee }) {
  const ref = await nextCaseRef(prisma);
  return prisma.case.create({
    data: {
      ref, kind, title, summary, riskLevel, tier, employeeId, branchId, evidence,
      assignee: assignee === undefined ? await namedReviewer(prisma, tier, branchId) : assignee,
      inCommitteeSummary: inCommitteeSummary ?? (riskLevel === 'HIGH' || tier === 'AUDIT_COMMITTEE'),
      openedAt: now,
      deadlineAt: deadlineAt || defaultDeadline(kind, tier, now),
      events: { create: [{ action: 'OPENED', actor, note: note || summary, evidence, timestamp: now }] },
    },
  });
}

async function alertReviewer(prisma, c) {
  const message = { title: `${c.ref} needs your review`, body: `${c.title}. ${c.summary}`, link: `/cases/${c.id}`, createdAt: c.openedAt };
  if (c.tier === 'TEAM_LEAD') {
    const leads = await prisma.user.findMany({ where: { role: 'TEAM_LEAD', branchId: c.branchId }, select: { id: true } });
    for (const lead of leads) await notifyUser(prisma, lead.id, message);
  } else {
    await notifyRole(prisma, c.tier, message);
  }
}

// A second High case for the same employee, or the same branch's manager and target,
// within six months goes to the audit committee.
async function isRepeatHigh(prisma, { kind, employeeId, branchId, now }) {
  const where = kind === 'BRANCH_PRESSURE' ? { kind, branchId } : { kind, employeeId };
  const prior = await prisma.case.findFirst({ where: { ...where, riskLevel: 'HIGH', openedAt: { gte: new Date(now.getTime() - REPEAT_WINDOW_DAYS * DAY), lt: now } } });
  return !!prior;
}

// Retaliation guard: if someone holding a sealed speak-up report is later flagged or
// dismissed, the audit committee is told at once, without linking the report by name.
async function fireRetaliationGuard(prisma, { employee, trigger, now }) {
  const report = await prisma.speakUpReport.findFirst({ where: { reporterSeal: reporterSeal(employee.id), createdAt: { lt: now } } });
  if (!report) return null;
  const existing = await prisma.case.findFirst({ where: { kind: 'RETALIATION_GUARD', employeeId: employee.id, status: { not: 'CLOSED' } } });
  if (existing) return existing;
  const c = await openCase(prisma, {
    kind: 'RETALIATION_GUARD',
    title: `Retaliation guard: ${trigger}`,
    summary: `An employee who earlier filed a protected speak-up report has since been ${trigger}. The audit committee must check the action is not retaliation. The report's content stays anonymous.`,
    riskLevel: 'HIGH',
    tier: 'AUDIT_COMMITTEE',
    employeeId: employee.id,
    branchId: employee.branchId,
    inCommitteeSummary: true,
    now,
    actor: 'System (retaliation guard)',
  });
  await alertReviewer(prisma, c);
  return c;
}

// Scoring inputs: 146 days reach the longest cohort.
async function loadScoringData(prisma, asOf) {
  const from = new Date(asOf.getTime() - 146 * DAY);
  const [employees, accounts, complaints] = await Promise.all([
    prisma.employee.findMany(),
    prisma.accountRecord.findMany({ where: { openedAt: { gt: from, lte: asOf } } }),
    prisma.complaint.findMany({ where: { receivedAt: { gt: from, lte: asOf } } }),
  ]);
  return { employees, accounts, complaints };
}

async function latestScores(prisma, asOf) {
  const last = await prisma.riskScore.findFirst({ where: asOf ? { asOf: { lte: asOf } } : undefined, orderBy: { asOf: 'desc' }, select: { asOf: true } });
  if (!last) return [];
  return prisma.riskScore.findMany({ where: { asOf: last.asOf } });
}

// The Pressure Index as it stood at a point in time, using the scores of that run.
async function pressureAt(prisma, asOf, config) {
  const [branches, employees, accounts, targetChanges, reports, scores, earlierScores, cases, dismissals] = await Promise.all([
    prisma.branch.findMany({ orderBy: { code: 'asc' } }),
    prisma.employee.findMany(),
    prisma.accountRecord.findMany({ where: { openedAt: { gt: new Date(asOf.getTime() - 90 * DAY), lte: asOf } }, select: { branchId: true, employeeId: true, openedAt: true } }),
    prisma.targetChange.findMany(),
    prisma.speakUpReport.findMany({ select: { branchId: true, createdAt: true } }),
    latestScores(prisma, asOf),
    latestScores(prisma, new Date(asOf.getTime() - 28 * DAY)),
    prisma.case.findMany(),
    prisma.dismissal.findMany(),
  ]);
  return computePressure({ branches, employees, accounts, targetChanges, reports, scores, earlierScores, cases, dismissals, config, asOf });
}

// What a proposed config would do to today's flags. Weakened counts anyone whose level
// would fall, including High to Medium, because that also moves their review to a lower
// tier. Shown before anyone can approve the change.
async function changeImpact(prisma, config, proposed, asOf) {
  const data = await loadScoringData(prisma, asOf);
  const rank = { LOW: 0, MEDIUM: 1, HIGH: 2 };
  const before = computeRiskTable({ ...data, config, asOf });
  const after = new Map(computeRiskTable({ ...data, config: proposed, asOf }).map((r) => [r.employeeId, r]));
  return {
    flagged: before.filter((r) => r.level !== 'LOW').length,
    weakened: before.filter((r) => rank[after.get(r.employeeId).level] < rank[r.level]).length,
  };
}

// One scoring run: writes a score per employee, opens or escalates cases, tells people
// about level changes, then checks the manager and monitoring levels.
async function runScoring(prisma, { now }) {
  const config = await loadConfig(prisma);
  const data = await loadScoringData(prisma, now);
  const previous = new Map((await latestScores(prisma)).map((s) => [s.employeeId, s]));
  const table = computeRiskTable({ ...data, config, asOf: now });

  await prisma.riskScore.deleteMany({ where: { asOf: now } });
  await prisma.riskScore.createMany({
    data: table.map((r) => ({ employeeId: r.employeeId, branchId: r.branchId, asOf: now, score: r.score, level: r.level, metrics: r.metrics })),
  });

  const empById = new Map(data.employees.map((e) => [e.id, e]));
  const opened = [];
  for (const r of table) {
    const before = previous.get(r.employeeId);
    const employee = empById.get(r.employeeId);
    const user = await prisma.user.findFirst({ where: { employeeId: r.employeeId } });
    if (user && before?.level !== r.level) {
      await notifyUser(prisma, user.id, {
        title: `Your risk level is now ${r.level === 'HIGH' ? 'High' : r.level === 'MEDIUM' ? 'Medium' : 'Low'}`,
        body: 'A score is an indicator, not proof. Open your dashboard to see which metrics passed the threshold, why they matter, and how to dispute it.',
        link: '/me',
        createdAt: now,
      });
    }
    if (r.level === 'LOW') continue;

    const accounts = data.accounts.filter((a) => a.employeeId === r.employeeId);
    const complaints = data.complaints.filter((c) => c.employeeId === r.employeeId);
    const evidence = {
      score: r.score, level: r.level, metrics: r.metrics, asOf: now.toISOString(),
      accounts: flaggedAccounts(accounts, complaints, now).slice(0, 12).map((a) => ({ ...a, openedAt: a.openedAt.toISOString() })),
    };
    const reason = `Scored ${r.score} against peers in the same role and branch, with ${r.metrics.counts.customersAffected} customers affected.`;
    const openFlag = await prisma.case.findFirst({ where: { kind: 'EMPLOYEE_FLAG', employeeId: r.employeeId, status: { not: 'CLOSED' } } });
    if (!openFlag) {
      const repeat = r.level === 'HIGH' && (await isRepeatHigh(prisma, { kind: 'EMPLOYEE_FLAG', employeeId: r.employeeId, now }));
      const c = await openCase(prisma, {
        kind: 'EMPLOYEE_FLAG',
        title: `${r.level === 'HIGH' ? 'High' : 'Medium'} risk flag: ${employee.name}`,
        summary: repeat ? `${reason} This is a second High case within six months, so it goes to the audit committee.` : reason,
        riskLevel: r.level,
        tier: repeat ? 'AUDIT_COMMITTEE' : r.level === 'HIGH' ? 'CONDUCT_RISK' : 'TEAM_LEAD',
        employeeId: r.employeeId,
        branchId: r.branchId,
        evidence,
        now,
        deadlineAt: repeat ? new Date(now.getTime() + 48 * HOUR) : undefined,
      });
      opened.push(c);
      await alertReviewer(prisma, c);
      if (user) {
        await notifyUser(prisma, user.id, {
          title: `${c.ref} was opened about your record`,
          body: `Your reviewer is ${c.assignee}. Your dashboard explains which metrics passed the threshold and why they matter, and you can dispute the flag with supporting evidence.`,
          link: '/me',
          createdAt: now,
        });
      }
      await fireRetaliationGuard(prisma, { employee, trigger: 'flagged by the scoring engine', now });
    } else if (r.level === 'HIGH' && openFlag.riskLevel !== 'HIGH') {
      const assignee = await namedReviewer(prisma, 'CONDUCT_RISK', r.branchId);
      const updated = await prisma.case.update({
        where: { id: openFlag.id },
        data: {
          riskLevel: 'HIGH', tier: 'CONDUCT_RISK', assignee, inCommitteeSummary: true, evidence,
          title: `High risk flag: ${employee.name}`, deadlineAt: new Date(now.getTime() + 48 * HOUR),
          events: { create: [{ action: 'ESCALATED', actor: SYSTEM, note: `Risk level rose to High. ${reason} Assigned to ${assignee}, conduct risk, with a 48 hour deadline.`, evidence, timestamp: now }] },
        },
      });
      await alertReviewer(prisma, { ...updated, openedAt: now });
    }
  }

  // The key link: high pressure and employee flags together point at the manager and
  // the target. A branch cannot independently review the pressure it creates, so the
  // case goes to the conduct risk team.
  const pressure = await pressureAt(prisma, now, config);
  for (const p of pressure.filter((x) => x.flagged)) {
    const open = await prisma.case.findFirst({ where: { kind: 'BRANCH_PRESSURE', branchId: p.branchId, status: { not: 'CLOSED' } } });
    if (open) continue;
    const repeat = await isRepeatHigh(prisma, { kind: 'BRANCH_PRESSURE', branchId: p.branchId, now });
    const c = await openCase(prisma, {
      kind: 'BRANCH_PRESSURE',
      title: `Pressure flag: Branch ${p.code} manager and target`,
      summary: `Pressure Index ${p.index}. ${Math.round(p.pctMissing * 100)}% of staff are missing a target of ${p.weeklyTarget} accounts a week, and ${Math.round(p.flaggedShare * 100)}% are rated Medium or High${p.flagsRising ? ', with flags rising' : ''}. This flags the manager and the target, not only the employees.`,
      riskLevel: 'HIGH',
      tier: repeat ? 'AUDIT_COMMITTEE' : 'CONDUCT_RISK',
      employeeId: p.managerId,
      branchId: p.branchId,
      evidence: { pressure: { index: p.index, pctMissing: p.pctMissing, missing: p.missing, staff: p.staff, targetIncrease: p.targetIncrease, spikeRatio: p.spikeRatio, speakUps: p.speakUps, flaggedShare: p.flaggedShare, flagsRising: p.flagsRising, avgHours: p.avgHours, dismissed: p.dismissed, parts: p.parts } },
      now,
    });
    await alertReviewer(prisma, c);
  }

  await checkFlagVolume(prisma, { config, now, current: table.filter((r) => r.level !== 'LOW').length, accounts: data.accounts });
  await checkUnapprovedChanges(prisma, now);
  return { table, opened, pressure, config };
}

// Warning sign: flags falling sharply in a month while sales volumes hold.
async function checkFlagVolume(prisma, { config, now, current, accounts }) {
  const monthAgo = new Date(now.getTime() - 28 * DAY);
  const earlier = await latestScores(prisma, monthAgo);
  const earlierFlags = earlier.filter((s) => s.level !== 'LOW').length;
  if (earlierFlags < 2 || current > earlierFlags * (1 - config.flag_drop_pct / 100)) return null;
  const recent = accounts.filter((a) => a.openedAt > monthAgo).length;
  const before = accounts.filter((a) => a.openedAt <= monthAgo && a.openedAt > new Date(monthAgo.getTime() - 28 * DAY)).length;
  if (before && recent < before * 0.75) return null;
  return raiseWatcherAlert(prisma, {
    type: 'FLAG_VOLUME_DROP',
    severity: 'HIGH',
    title: 'Sudden drop in flags',
    detail: `Flags fell from ${earlierFlags} to ${current} in a month while sales volumes held. This may mean detection was turned down, not that misconduct stopped.`,
    createdAt: now,
  });
}

// Overdue auto-escalation. Medium cases move to conduct risk after 5 working days, and
// anything conduct risk leaves past its deadline moves to the Chief Risk Officer.
async function sweepOverdue(prisma, { now }) {
  const overdue = await prisma.case.findMany({ where: { status: { not: 'CLOSED' }, deadlineAt: { lt: now }, tier: { in: ['TEAM_LEAD', 'CONDUCT_RISK'] } } });
  for (const c of overdue) {
    const toCro = c.tier === 'CONDUCT_RISK';
    const tier = toCro ? 'CHIEF_RISK_OFFICER' : 'CONDUCT_RISK';
    const assignee = await namedReviewer(prisma, tier, c.branchId);
    const note = toCro
      ? `Conduct risk missed the deadline. Auto-escalated to ${assignee}, Chief Risk Officer.`
      : `The team lead missed the 5 working day deadline. Auto-escalated to ${assignee}, conduct risk, with 48 hours to review.`;
    const updated = await prisma.case.update({
      where: { id: c.id },
      data: {
        tier, assignee,
        deadlineAt: new Date(now.getTime() + 48 * HOUR),
        events: { create: [{ action: 'ESCALATED', actor: 'System (deadline sweep)', note, timestamp: now }] },
      },
    });
    await notifyRole(prisma, tier, { title: `${updated.ref} escalated to you`, body: note, link: `/cases/${c.id}`, createdAt: now });
  }
  return overdue.length;
}

// Each sales misconduct dismissal opens a review of the branch and manager.
async function recordDismissal(prisma, { employee, reason, category = 'SALES_MISCONDUCT', now, openReview = true }) {
  const dismissal = await prisma.dismissal.create({ data: { employeeId: employee.id, branchId: employee.branchId, category, reason, dismissedAt: now } });
  await prisma.employee.update({ where: { id: employee.id }, data: { status: 'DISMISSED' } });
  if (category !== 'SALES_MISCONDUCT' || !openReview) return { dismissal };
  const branch = await prisma.branch.findUnique({ where: { id: employee.branchId } });
  const review = await openCase(prisma, {
    kind: 'DISMISSAL_REVIEW',
    title: `Dismissal review: Branch ${branch.code} ${branch.name}`,
    summary: `${employee.name} was dismissed for sales misconduct. Review the branch and its manager for a wider pattern rather than treating this as one person's failure.`,
    riskLevel: 'HIGH',
    tier: 'CONDUCT_RISK',
    branchId: employee.branchId,
    now,
    evidence: { dismissal: { reason, category } },
    actor: 'System (dismissal trigger)',
  });
  await alertReviewer(prisma, review);
  const guard = await fireRetaliationGuard(prisma, { employee, trigger: 'dismissed', now });
  return { dismissal, review, guard };
}

module.exports = {
  getNow, tick, addWorkingDays, reporterSeal, loadConfig,
  notifyUser, notifyRole, raiseWatcherAlert, findUnapprovedChanges, checkUnapprovedChanges,
  openCase, alertReviewer, namedReviewer, fireRetaliationGuard,
  loadScoringData, pressureAt, latestScores, changeImpact, runScoring, sweepOverdue, recordDismissal,
};
