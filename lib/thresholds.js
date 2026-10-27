// M4 detection thresholds. The live values are stored in the Threshold table
// and can only be changed through M7 (maker-checker sign-off). These are the
// definitions and defaults (prisma/seed.js uses the same values).

export const THRESHOLDS = [
  {
    key: 'CONSENT_DECLINE_RATE',
    label: 'Consent declined or ignored',
    unit: 'PERCENT',
    value: 40,
    scope: 'banker',
    description: 'Share of a banker’s new-account consent requests that customers declined or never answered (M2).',
  },
  {
    key: 'UNUSED_ACCOUNT_RATE',
    label: 'Accounts unused after 90 days',
    unit: 'PERCENT',
    value: 20,
    scope: 'banker',
    description: 'Share of a banker’s reviewed accounts whose incentive lapsed because the customer never used them (M3).',
  },
  {
    key: 'CONTACT_CHANGE_FLAGS',
    label: 'Blocked or disputed contact changes',
    unit: 'COUNT',
    value: 1,
    scope: 'banker',
    description: 'Contact-detail changes by a banker that M1 blocked or the customer disputed.',
  },
  {
    key: 'STAFF_FUNDING_REVERSALS',
    label: 'Staff transfer-and-reverse fundings',
    unit: 'COUNT',
    value: 1,
    scope: 'banker',
    description: 'Times a banker funded a customer’s new account and then reversed it, to make it look used (M3).',
  },
  {
    key: 'SPEAK_UP_REPORTS',
    label: 'Speak-up reports about a branch (90 days)',
    unit: 'COUNT',
    value: 2,
    scope: 'branch',
    description: 'Speak-up reports naming the branch in the last 90 days (M5).',
  },
];

// A threshold at or above these values can never trigger — monitoring for that
// metric is effectively switched off (flagged in M7's coverage report).
export const EFFECTIVELY_OFF = { PERCENT: 100, COUNT: 50 };

export function thresholdDef(key) {
  return THRESHOLDS.find((t) => t.key === key);
}

export function formatValue(unit, value) {
  if (value === null || value === undefined) return '—';
  return unit === 'PERCENT' ? `${Math.round(value)}%` : `${value}`;
}
