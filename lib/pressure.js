// The Pressure Index: pressure from managers and targets, linked to employee flags. Pure
// functions, CommonJS so the seed can share them.
const { DAY } = require('./scoring');

const clamp01 = (n) => Math.max(0, Math.min(1, n));

// The Pressure Index, 0 to 100 per branch and manager. The most points each part can add:
const PARTS = [
  { key: 'missing', label: 'Target miss rate', max: 25 },
  { key: 'teamFlags', label: 'Team flag rate', max: 20 },
  { key: 'target', label: 'Target increases', max: 15 },
  { key: 'spike', label: 'End-of-month sales spikes', max: 10 },
  { key: 'speakUp', label: 'Pressure reports', max: 10 },
  { key: 'response', label: 'Manager response time', max: 10 },
  { key: 'dismissals', label: 'Sales misconduct dismissals', max: 10 },
];

// A branch is High when its Pressure Index is at the threshold or when enough of its
// staff are rated High. Medium uses the same 40 line as employee scores.
function branchRating(index, highShare, config) {
  if (index >= config.pressure_flag || highShare * 100 >= config.branch_high_share) return 'HIGH';
  return index >= config.level_medium ? 'MEDIUM' : 'LOW';
}

function computePressure({ branches, employees, accounts, targetChanges, reports, scores, earlierScores = [], cases, dismissals, config, asOf }) {
  const t = asOf.getTime();
  return branches.map((b) => {
    const staff = employees.filter((e) => e.branchId === b.id && !e.isManager && e.status === 'ACTIVE');
    const last28 = accounts.filter((a) => a.branchId === b.id && a.openedAt.getTime() > t - 28 * DAY && a.openedAt <= asOf);
    const missing = staff.filter((e) => last28.filter((a) => a.employeeId === e.id).length / 4 < b.weeklyTarget).length;
    const pctMissing = staff.length ? missing / staff.length : 0;

    const changes = targetChanges
      .filter((c) => c.branchId === b.id && c.effectiveAt.getTime() > t - 180 * DAY && c.effectiveAt <= asOf)
      .sort((x, y) => x.effectiveAt - y.effectiveAt);
    const targetIncrease = changes.length ? (changes[changes.length - 1].newTarget - changes[0].oldTarget) / changes[0].oldTarget : 0;

    // Share of the last 90 days' accounts opened in the final 3 days of a calendar
    // month, against the roughly 10% an even spread would give.
    const last90 = accounts.filter((a) => a.branchId === b.id && a.openedAt.getTime() > t - 90 * DAY && a.openedAt <= asOf);
    const atMonthEnd = last90.filter((a) => {
      const d = a.openedAt;
      const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
      return d.getUTCDate() > lastDay - 3;
    }).length;
    const spikeRatio = last90.length ? atMonthEnd / last90.length / 0.1 : 0;

    const speakUps = reports.filter((r) => r.branchId === b.id && r.createdAt.getTime() > t - 90 * DAY && r.createdAt <= asOf).length;

    const team = scores.filter((s) => s.branchId === b.id);
    const high = team.filter((s) => s.level === 'HIGH').length;
    const medium = team.filter((s) => s.level === 'MEDIUM').length;
    const avgScore = team.length ? team.reduce((n, s) => n + s.score, 0) / team.length : 0;
    const flaggedShare = team.length ? (high + medium) / team.length : 0;
    const highShare = team.length ? high / team.length : 0;
    const earlierFlagged = earlierScores.filter((s) => s.branchId === b.id && s.level !== 'LOW').length;
    const flagsRising = high + medium > earlierFlagged;

    // How quickly the manager acts on the Medium flags routed to them.
    const leadCases = cases.filter((c) => c.branchId === b.id && c.kind === 'EMPLOYEE_FLAG' && c.riskLevel === 'MEDIUM' && c.openedAt <= asOf);
    const acted = leadCases.filter((c) => c.firstActionAt && c.firstActionAt <= asOf).map((c) => (c.firstActionAt - c.openedAt) / 3600000);
    const avgHours = acted.length ? acted.reduce((n, h) => n + h, 0) / acted.length : null;
    const overdue = cases.filter((c) => c.branchId === b.id && c.status !== 'CLOSED' && c.deadlineAt < asOf).length;

    const dismissed = dismissals.filter((d) => d.branchId === b.id && d.category === 'SALES_MISCONDUCT' && d.dismissedAt.getTime() > t - 90 * DAY && d.dismissedAt <= asOf).length;

    const parts = {
      missing: clamp01(pctMissing) * 25,
      teamFlags: clamp01(flaggedShare) * 20,
      target: clamp01(targetIncrease / 2) * 15,
      spike: clamp01((spikeRatio - 1) / 2) * 10,
      speakUp: clamp01(speakUps / 6) * 10,
      response: clamp01((avgHours ?? 0) / 168) * 10,
      dismissals: clamp01(dismissed / 5) * 10,
    };
    const index = Math.round(Object.values(parts).reduce((n, v) => n + v, 0));
    const manager = employees.find((e) => e.branchId === b.id && e.isManager);
    return {
      branchId: b.id, code: b.code, name: b.name, managerId: manager?.id, managerName: manager?.name, weeklyTarget: b.weeklyTarget,
      staff: staff.length, missing, pctMissing, targetIncrease, changes, spikeRatio, speakUps, dismissed, parts, index,
      high, medium, avgScore: Math.round(avgScore), flaggedShare, highShare, flagsRising, avgHours, overdue,
      speedRating: avgHours === null ? 'No flags yet' : avgHours < 1 ? 'Unusually fast' : avgHours <= 24 ? 'Prompt' : avgHours <= 72 ? 'Acceptable' : 'Slow',
      rating: branchRating(index, highShare, config),
      flagged: index >= config.pressure_flag,
    };
  });
}

module.exports = { PARTS, computePressure, branchRating };
