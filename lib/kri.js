import { prisma } from '@/lib/prisma';
import { METRICS, configMap } from '@/lib/scoring';
import { getNow, latestScores, pressureAt } from '@/lib/engine';

// The single source of truth for dashboard KRIs and effectiveness metrics.

const DAY = 24 * 60 * 60 * 1000;
const DEADLINE_HOURS = { MEDIUM: 120, HIGH: 48 };

function average(values) {
  return values.length ? values.reduce((n, v) => n + v, 0) / values.length : null;
}

export async function getEffectiveness() {
  const [now, flags, disputes, runs, branches] = await Promise.all([
    getNow(prisma),
    prisma.case.findMany({ where: { kind: 'EMPLOYEE_FLAG' } }),
    prisma.dispute.findMany({ include: { case: true } }),
    prisma.riskScore.findMany({ select: { asOf: true, metrics: true, level: true }, orderBy: { asOf: 'asc' } }),
    prisma.branch.findMany({ orderBy: { code: 'asc' } }),
  ]);

  // A flag counts once it is closed or its deadline has passed.
  const due = flags.filter((c) => c.closedAt || c.deadlineAt < now);
  const onTime = due.filter((c) => c.closedAt && c.closedAt <= c.deadlineAt).length;
  const closed = flags.filter((c) => c.closedAt);
  const hoursToClose = (c) => (c.closedAt - c.openedAt) / 3600000;
  const avgHours = average(closed.map(hoursToClose)) ?? 0;
  const byLevel = ['MEDIUM', 'HIGH'].map((level) => {
    const rows = closed.filter((c) => c.riskLevel === level);
    const hours = average(rows.map(hoursToClose));
    return { level, count: rows.length, avgHours: hours, deadlineHours: DEADLINE_HOURS[level], withinDeadline: hours !== null && hours <= DEADLINE_HOURS[level] };
  });

  const overturned = disputes.filter((d) => d.status === 'UPHELD');
  const falseAlarmsByMetric = METRICS.map((m) => ({
    key: m.key,
    label: m.label,
    disputes: disputes.filter((d) => d.metricKey === m.key).length,
    upheld: overturned.filter((d) => d.metricKey === m.key).length,
  })).filter((m) => m.disputes > 0);
  const falseAlarmsByBranch = branches.map((b) => {
    const rows = closed.filter((c) => c.branchId === b.id);
    const upheld = overturned.filter((d) => d.case.branchId === b.id).length;
    return { code: b.code, name: b.name, closed: rows.length, upheld, rate: rows.length ? upheld / rows.length : 0 };
  });

  const byRun = new Map();
  for (const s of runs) {
    const key = s.asOf.toISOString();
    if (!byRun.has(key)) byRun.set(key, { asOf: s.asOf, unused: 0, cohort: 0, flags: 0 });
    const row = byRun.get(key);
    row.unused += s.metrics?.counts?.unused || 0;
    row.cohort += s.metrics?.counts?.unusedCohort || 0;
    if (s.level !== 'LOW') row.flags += 1;
  }
  const trend = [...byRun.values()].map((r) => ({ asOf: r.asOf, rate: r.cohort ? r.unused / r.cohort : 0, flags: r.flags }));

  return {
    now,
    dueCount: due.length,
    onTime,
    pctOnTime: due.length ? onTime / due.length : 0,
    avgHours,
    byLevel,
    closedCount: closed.length,
    falseAlarmRate: closed.length ? overturned.length / closed.length : 0,
    upheldCount: overturned.length,
    falseAlarmsByMetric,
    falseAlarmsByBranch,
    trend,
  };
}

export async function getOverview() {
  const [now, employees, scores, config, cases] = await Promise.all([
    getNow(prisma),
    prisma.employee.findMany(),
    latestScores(prisma),
    prisma.scoringConfig.findMany().then(configMap),
    prisma.case.findMany({ where: { status: { not: 'CLOSED' } } }),
  ]);
  // The Pressure Index is refreshed with the daily data load, like employee scores, so it
  // reads the same all day and matches the morning briefing.
  const pressure = await pressureAt(prisma, scores[0]?.asOf || now, config);
  const name = new Map(employees.map((e) => [e.id, e.name]));

  const heat = pressure.map((p) => {
    const team = scores.filter((s) => s.branchId === p.branchId);
    const metricAverages = Object.fromEntries(
      METRICS.map((m) => [m.key, team.length ? team.reduce((n, s) => n + Math.max(0, Math.min(3, s.metrics[m.key]?.z || 0)), 0) / team.length : 0]),
    );
    return { ...p, metricAverages };
  });
  const rank = { HIGH: 2, MEDIUM: 1, LOW: 0 };
  heat.sort((a, b) => rank[b.rating] - rank[a.rating] || b.index - a.index);

  const topEmployees = [...scores]
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((s) => ({ employeeId: s.employeeId, name: name.get(s.employeeId), code: pressure.find((p) => p.branchId === s.branchId)?.code, score: s.score, level: s.level }));

  return {
    now, config, heat, pressure, topEmployees,
    totals: {
      staff: scores.length,
      high: scores.filter((s) => s.level === 'HIGH').length,
      medium: scores.filter((s) => s.level === 'MEDIUM').length,
      openCases: cases.length,
      overdue: cases.filter((c) => c.deadlineAt < now).length,
      pressureFlags: cases.filter((c) => c.kind === 'BRANCH_PRESSURE').length,
    },
  };
}

// The audit committee's monthly pack: what reached them without anyone choosing to forward it.
export async function getCommitteeSummary() {
  const now = await getNow(prisma);
  const monthAgo = new Date(now.getTime() - 30 * DAY);
  const [cases, appeals, dismissals, alerts, effectiveness, config, complaints, reports] = await Promise.all([
    prisma.case.findMany({
      where: { OR: [{ inCommitteeSummary: true }, { tier: 'AUDIT_COMMITTEE' }], status: { not: 'CLOSED' } },
      include: { events: { orderBy: { timestamp: 'asc' } }, employee: true, branch: true },
      orderBy: [{ openedAt: 'desc' }, { ref: 'asc' }],
    }),
    prisma.dispute.findMany({ where: { type: 'APPEAL', status: 'OPEN' }, include: { case: true, employee: true } }),
    prisma.dismissal.findMany({ include: { branch: true } }),
    prisma.watcherAlert.findMany({ where: { type: { notIn: ['THRESHOLD_CHANGE', 'LOG_TAMPERING', 'UNAPPROVED_CHANGE'] }, createdAt: { gte: monthAgo } }, orderBy: { createdAt: 'desc' } }),
    getEffectiveness(),
    prisma.scoringConfig.findMany(),
    prisma.complaint.findMany({ where: { receivedAt: { gte: monthAgo, lte: now } }, include: { branch: true, employee: true } }),
    prisma.speakUpReport.findMany({ where: { createdAt: { gte: monthAgo, lte: now } }, include: { branch: true } }),
  ]);
  const [latestRun] = await latestScores(prisma);
  const pressure = await pressureAt(prisma, latestRun?.asOf || now, configMap(config));

  const months = Array.from({ length: 6 }, (_, i) => {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - i), 1));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (4 - i), 1));
    const rows = dismissals.filter((d) => d.category === 'SALES_MISCONDUCT' && d.dismissedAt >= start && d.dismissedAt < end);
    return { start, total: rows.length, branch12: rows.filter((d) => d.branch.code === 12).length };
  });
  const dismissalsByBranch = {};
  for (const d of dismissals) dismissalsByBranch[d.branch.code] = (dismissalsByBranch[d.branch.code] || 0) + 1;

  const countBy = (rows, key) => {
    const counts = new Map();
    for (const r of rows) counts.set(key(r), (counts.get(key(r)) || 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  };

  return {
    now, cases, appeals, months, dismissalsByBranch, alerts, effectiveness,
    topPressure: [...pressure].sort((a, b) => b.index - a.index).slice(0, 3),
    complaints: {
      total: complaints.length,
      didNotAuthorise: complaints.filter((c) => c.category === 'DID_NOT_AUTHORISE').length,
      topEmployees: countBy(complaints, (c) => `${c.employee.name}, Branch ${c.branch.code}`).slice(0, 5),
    },
    speakUp: { total: reports.length, byBranch: countBy(reports, (r) => `Branch ${r.branch.code}`) },
  };
}
