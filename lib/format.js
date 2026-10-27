// Shared labels and formatting helpers (safe to use in server and client components).

export const MODULES = {
  M1: { name: 'Contact-Integrity Guard', layer: 'Prevent', href: '/customers' },
  M2: { name: 'Independent Consent Gate', layer: 'Prevent', href: '/accounts/new' },
  M3: { name: 'Usage-Linked Incentive Engine', layer: 'Remove the reward', href: '/incentives' },
  M4: { name: 'Conduct Analytics', layer: 'Detect', href: '/alerts' },
  M5: { name: 'Speak-Up Channel', layer: 'Detect', href: '/speak-up' },
  M6: { name: 'Escalation & Case Management', layer: 'Govern', href: '/cases' },
  M7: { name: 'Tamper-Evident Control Governance', layer: 'Govern', href: '/governance' },
};

export const ALERT_TYPES = {
  BLOCKED_CONTACT_CHANGE: 'Blocked contact change',
  CONTACT_CHANGE_DISPUTED: 'Customer disputed a contact change',
  CONSENT_DECLINED: 'Customer declined a new account',
  CONSENT_EXPIRED: 'New-account consent ignored',
  UNUSED_ACCOUNT_90D: 'Account unused after 90 days',
  BANKER_PATTERN: 'Banker conduct pattern',
  BRANCH_PATTERN: 'Branch conduct pattern',
  BRANCH_WIDE_PATTERN: 'Branch conduct pattern',
  RETALIATION_FLAGGED: 'Possible retaliation against a reporter',
  LOG_TAMPERING_DETECTED: 'Control log tampering detected',
};

export const DISMISS_REASONS = [
  'Genuine customer activity (false positive)',
  'Duplicate of an existing alert',
  'Below materiality threshold',
  'Already being handled in another case',
];

export const REPORT_THEMES = {
  SALES_PRESSURE: 'Pressure to hit sales targets',
  UNAUTHORISED_ACCOUNTS: 'Accounts opened without consent',
  MISSELLING: 'Mis-selling products',
  RETALIATION: 'Retaliation for speaking up',
  OTHER: 'Other conduct concern',
};

export const CASE_LEVELS = {
  BRANCH: { label: 'Branch', sla: '5 days' },
  CONDUCT_OFFICE: { label: 'Conduct Office', sla: '48 hours' },
  CRO: { label: 'Chief Risk Officer', sla: '24 hours' },
};

export function alertTypeLabel(type) {
  return ALERT_TYPES[type] || type.replace(/_/g, ' ').toLowerCase().replace(/^./, (c) => c.toUpperCase());
}

export function sgd(amount) {
  return `S$${Number(amount).toLocaleString('en-SG', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

export function cents(amountCents) {
  const sign = amountCents < 0 ? '−' : '+';
  return `${sign}S$${(Math.abs(amountCents) / 100).toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatDateTime(value) {
  return new Date(value).toLocaleString('en-SG', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value) {
  return new Date(value).toLocaleDateString('en-SG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function timeAgo(value, now = Date.now()) {
  const diff = Math.round((now - new Date(value).getTime()) / 1000);
  const abs = Math.abs(diff);
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, secs] of units) {
    if (abs >= secs) {
      const n = Math.floor(abs / secs);
      return diff >= 0 ? `${n} ${unit}${n === 1 ? '' : 's'} ago` : `in ${n} ${unit}${n === 1 ? '' : 's'}`;
    }
  }
  return 'just now';
}

export function timeLeft(deadline, now = Date.now()) {
  const ms = new Date(deadline).getTime() - now;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / 3600000);
  const d = Math.floor(h / 24);
  const text = d >= 1 ? `${d}d ${h % 24}h` : `${h}h ${Math.floor((abs % 3600000) / 60000)}m`;
  return ms >= 0 ? `${text} left` : `${text} overdue`;
}
