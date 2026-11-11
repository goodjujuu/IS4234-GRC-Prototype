// Shared labels and formatting helpers (safe to use in server and client components).
// Times always render in US Pacific time, so the server and browser agree.
const TIME_ZONE = 'America/Los_Angeles';

export const ROLE_LABELS = {
  EMPLOYEE: 'Employee',
  TEAM_LEAD: 'Team lead',
  CONDUCT_RISK: 'Conduct risk team',
  CHIEF_RISK_OFFICER: 'Chief Risk Officer',
  INTERNAL_AUDIT: 'Internal audit',
  AUDIT_COMMITTEE: 'Audit committee',
};

export const TIER_LABELS = {
  TEAM_LEAD: 'Team lead',
  CONDUCT_RISK: 'Conduct risk team',
  CHIEF_RISK_OFFICER: 'Chief Risk Officer',
  AUDIT_COMMITTEE: 'Audit committee',
};

export const CASE_KINDS = {
  EMPLOYEE_FLAG: 'Employee flag',
  BRANCH_PRESSURE: 'Manager and target',
  DISMISSAL_REVIEW: 'Dismissal pattern',
  RETALIATION_GUARD: 'Speak-up reporter',
};

export const OUTCOMES = { CLEARED: 'Cleared', COACHING: 'Coaching', INVESTIGATION: 'Investigation', TARGET_REVIEW: 'Target review' };

// Manager and target cases have a fourth outcome, which sends the target for adjustment.
export function outcomesFor(kind) {
  const keys = ['BRANCH_PRESSURE', 'DISMISSAL_REVIEW'].includes(kind) ? ['CLEARED', 'COACHING', 'INVESTIGATION', 'TARGET_REVIEW'] : ['CLEARED', 'COACHING', 'INVESTIGATION'];
  return keys.map((value) => ({ value, label: OUTCOMES[value] }));
}

export const REPORT_THEMES = {
  TARGET_PRESSURE: 'Pressure from sales targets',
  INSTRUCTED_MISCONDUCT: 'Told to do something improper',
  RETALIATION: 'Retaliation for speaking up',
  OTHER: 'Other concern',
};

export const LEVEL_TONE = { HIGH: 'red', MEDIUM: 'amber', LOW: 'green' };

export const CHANGE_TONE = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red', BLOCKED: 'red' };

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-US', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-US', { timeZone: TIME_ZONE, day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatMonth(value) {
  return new Date(value).toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', year: 'numeric' });
}

export function formatClock(value) {
  return new Date(value).toLocaleString('en-US', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function percent(value) {
  return `${Math.round(value * 100)}%`;
}

export function formatHours(hours) {
  if (hours === null || hours === undefined) return 'None yet';
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`;
  if (hours < 48) return `${Math.round(hours)} h`;
  return `${Math.round(hours / 24)} days`;
}

export function timeLeft(deadline, now) {
  const ms = new Date(deadline).getTime() - new Date(now).getTime();
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const d = Math.floor(h / 24);
  const text = d >= 1 ? `${d}d ${h % 24}h` : `${h}h ${Math.floor((abs % 3600000) / 60000)}m`;
  return ms >= 0 ? `${text} left` : `${text} overdue`;
}

// A case involving a speak-up reporter has an immediate review deadline.
export function deadlineText(c, now) {
  return c.kind === 'RETALIATION_GUARD' ? 'Immediate' : timeLeft(c.deadlineAt, now);
}

export function isOverdue(c, now) {
  return c.status !== 'CLOSED' && c.kind !== 'RETALIATION_GUARD' && new Date(c.deadlineAt) < new Date(now);
}
