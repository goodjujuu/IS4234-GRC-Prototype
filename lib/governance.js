import { EFFECTIVELY_OFF } from '@/lib/thresholds';

// M7 — who may request and who may sign off a change to M4's thresholds.
export const PERSONAS = [
  { name: 'Riverside Regional Sales Manager', line: 'Business line (first line)' },
  { name: 'Conduct Office Analyst', line: 'Second line' },
  { name: 'Second-Line Risk Officer', line: 'Second line' },
  { name: 'Chief Risk Officer', line: 'Second line' },
];

export const SIGN_OFF_ROLES = ['Second-Line Risk Officer', 'Chief Risk Officer'];

export function isEffectivelyOff(unit, value) {
  return value >= EFFECTIVELY_OFF[unit];
}

const DAY = 24 * 60 * 60 * 1000;

// Weekly alert counts for the last 8 weeks, oldest first, plus a suppression
// flag if the latest week fell below half of the previous four weeks' average.
export function alertVolume(alerts, now = Date.now()) {
  const weeks = Array.from({ length: 8 }, (_, i) => {
    const end = now - (7 - i) * 7 * DAY;
    const start = end - 7 * DAY;
    const count = alerts.filter((a) => {
      const t = new Date(a.createdAt).getTime();
      return t > start && t <= end;
    }).length;
    return { start: new Date(start), end: new Date(end), count };
  });
  const latest = weeks[7].count;
  const prior = weeks.slice(3, 7).reduce((n, w) => n + w.count, 0) / 4;
  const suppressed = prior >= 2 && latest < prior / 2;
  return { weeks, latest, prior: Math.round(prior * 10) / 10, suppressed };
}
