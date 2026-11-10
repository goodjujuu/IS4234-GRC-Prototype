import { METRICS } from '@/lib/scoring';

// The seven metrics grouped by the kind of warning sign they show, for the employee's own pages.
export const CATEGORIES = [
  { key: 'response', label: 'Customer response', color: 'bg-indigo-500', description: 'Signs that customers did not want or use the account.', metrics: ['unused', 'closure', 'complaints'] },
  { key: 'setup', label: 'Account setup', color: 'bg-sky-400', description: 'Signs that an account was made to look genuine.', metrics: ['transfer', 'contact'] },
  { key: 'sales', label: 'Sales activity', color: 'bg-violet-400', description: 'Signs of selling under pressure.', metrics: ['accounts', 'sameDay'] },
];
export const HARM = { label: 'Customers affected', color: 'bg-slate-400' };

export const points = (n) => `${Math.round(n)} ${Math.round(n) === 1 ? 'point' : 'points'}`;

// One peer spread above the median stands out, the same rule the explanations use.
export function metricStatus(z) {
  if (z >= 2) return { label: 'Well above peers', tone: 'red', flagged: true };
  if (z >= 1) return { label: 'Above peers', tone: 'amber', flagged: true };
  return { label: 'In line with peers', tone: 'green', flagged: false };
}

export function metricsByCategory(latest) {
  return CATEGORIES.map((cat) => {
    const items = cat.metrics.map((key) => {
      const metric = METRICS.find((m) => m.key === key);
      const data = latest.metrics[key];
      return { metric, data, status: metricStatus(data.z) };
    });
    return { ...cat, items, points: items.reduce((n, i) => n + i.data.contribution, 0) };
  });
}

export function flaggedMetrics(latest) {
  if (!latest) return [];
  return METRICS.filter((m) => metricStatus(latest.metrics[m.key].z).flagged);
}

// Who reviews each level of flag, and how long they have.
export const FLAG_RULES = {
  MEDIUM: { reviewer: 'your team lead', deadline: '5 working days' },
  HIGH: { reviewer: 'the conduct risk team', deadline: '48 hours' },
};

// The indicators behind a case, read from the score snapshot stored when it was opened or escalated.
export function caseIndicators(evidence) {
  if (!evidence?.metrics) return [];
  return METRICS.map((metric) => ({ metric, data: evidence.metrics[metric.key], category: CATEGORIES.find((c) => c.metrics.includes(metric.key)) }))
    .filter(({ data }) => data && metricStatus(data.z).flagged)
    .sort((a, b) => b.data.contribution - a.data.contribution);
}
