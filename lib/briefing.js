// Builds the facts behind the Morning Briefing, and the fallback summary used when no
// model key is configured. The live model call is in lib/briefingAi.js. CommonJS so the
// seed can create the first briefing.
const { DAY, computeMetrics } = require('./scoring');

const PCT = (n) => `${Math.round(n * 100)}%`;
const LEVEL_WORD = { HIGH: 'High', MEDIUM: 'Medium', LOW: 'Low' };

// `pressure` is today's Pressure Index per branch, `previousPressure` the last run's.
async function buildBriefingFacts(prisma, { now, pressure, previousPressure }) {
  const { asOf: latestAt } = await prisma.riskScore.findFirst({ select: { asOf: true }, orderBy: { asOf: 'desc' } });
  const [latest, branches, employees, cases] = await Promise.all([
    prisma.riskScore.findMany({ where: { asOf: latestAt } }),
    prisma.branch.findMany(),
    prisma.employee.findMany(),
    prisma.case.findMany({ where: { status: { not: 'CLOSED' } } }),
  ]);

  const empById = new Map(employees.map((e) => [e.id, e]));
  const branchName = new Map(branches.map((b) => [b.id, `Branch ${b.code} ${b.name}`]));

  // New cases are those opened since the last morning.
  const scoreById = new Map(latest.map((s) => [s.employeeId, s.score]));
  const newFlags = cases
    .filter((c) => c.kind === 'EMPLOYEE_FLAG' && c.openedAt > new Date(now.getTime() - DAY))
    .map((c) => ({ name: empById.get(c.employeeId)?.name, branch: branchName.get(c.branchId), level: c.riskLevel, score: scoreById.get(c.employeeId) }))
    .sort((a, b) => b.score - a.score);

  const overdue = cases.filter((c) => c.deadlineAt < now).map((c) => ({ ref: c.ref, title: c.title, tier: c.tier }));

  const prevPressure = new Map(previousPressure.map((p) => [p.branchId, p]));
  const rising = pressure
    .map((p) => {
      const before = prevPressure.get(p.branchId);
      return {
        branchId: p.branchId, code: p.code, name: p.name, index: p.index, previous: before?.index ?? p.index,
        level: p.rating, previousLevel: before?.rating ?? p.rating,
      };
    })
    .filter((b) => b.index > b.previous || b.level !== b.previousLevel)
    .sort((a, b) => Number(b.level !== b.previousLevel) - Number(a.level !== a.previousLevel) || b.index - a.index);

  const top = rising[0];
  let cause = null;
  if (top) {
    const accounts = await prisma.accountRecord.findMany({ where: { branchId: top.branchId } });
    const target = await prisma.targetChange.findFirst({ where: { branchId: top.branchId, effectiveAt: { lte: now } }, orderBy: { effectiveAt: 'asc' } });
    const p = pressure.find((x) => x.branchId === top.branchId);
    cause = {
      branch: `Branch ${top.code}`,
      unusedBefore: computeMetrics(accounts, [], new Date(latestAt.getTime() - 56 * DAY)).values.unused,
      unusedAfter: computeMetrics(accounts, [], latestAt).values.unused,
      targetFrom: target?.oldTarget ?? null,
      targetTo: p?.weeklyTarget ?? null,
      pctMissing: p?.pctMissing ?? 0,
    };
  }

  return {
    asOf: now.toISOString(),
    newHigh: newFlags.filter((f) => f.level === 'HIGH'),
    newMedium: newFlags.filter((f) => f.level === 'MEDIUM'),
    overdue,
    rising,
    cause,
    pressureFlagged: pressure.filter((p) => p.flagged).map((p) => ({ code: p.code, name: p.name, manager: p.managerName, index: p.index })),
  };
}

// Deterministic stand-in for the AI summary, built only from the facts above.
function simulatedSummary(facts) {
  const top = facts.rising[0];
  if (!top) return 'No branch moved materially overnight. Pressure and flags remain in line with the previous run, so no cause analysis is suggested today.';
  const c = facts.cause;
  const moved = top.level !== top.previousLevel ? `moved to ${LEVEL_WORD[top.level]}` : 'saw a rising Pressure Index';
  const ratio = c && c.unusedBefore > 0 ? c.unusedAfter / c.unusedBefore : 0;
  const trend = ratio >= 1.8 ? 'nearly doubled' : ratio >= 1.2 ? 'rose' : 'moved';
  let text = `Branch ${top.code} ${moved} overnight, with its Pressure Index going from ${top.previous} to ${top.index}.`;
  if (c) {
    text += ` Unused accounts ${trend} from ${PCT(c.unusedBefore)} to ${PCT(c.unusedAfter)}`;
    text += c.targetFrom && c.targetTo ? ` following increases in the weekly target from ${c.targetFrom} to ${c.targetTo} accounts per employee.` : '.';
    text += ` ${PCT(c.pctMissing)} of staff are missing that target, which suggests pressure from the target is a likely cause rather than isolated employee conduct.`;
  }
  return text;
}

module.exports = { buildBriefingFacts, simulatedSummary };
