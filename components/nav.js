// Navigation structure, grouped by the four control layers.
export const LAYER_STYLES = {
  overview: { dot: 'bg-slate-400', text: 'text-slate-600', soft: 'bg-slate-100 text-slate-700', ring: 'ring-slate-200' },
  prevent: { dot: 'bg-sky-500', text: 'text-sky-700', soft: 'bg-sky-50 text-sky-700', ring: 'ring-sky-200' },
  reward: { dot: 'bg-emerald-500', text: 'text-emerald-700', soft: 'bg-emerald-50 text-emerald-700', ring: 'ring-emerald-200' },
  detect: { dot: 'bg-amber-500', text: 'text-amber-700', soft: 'bg-amber-50 text-amber-800', ring: 'ring-amber-200' },
  govern: { dot: 'bg-violet-500', text: 'text-violet-700', soft: 'bg-violet-50 text-violet-700', ring: 'ring-violet-200' },
};

export const NAV = [
  {
    layer: 'overview',
    title: 'Overview',
    items: [
      { href: '/', label: 'Home', icon: 'home' },
      { href: '/board', label: 'Board dashboard', icon: 'chart' },
    ],
  },
  {
    layer: 'prevent',
    title: '1 · Prevent',
    items: [
      { href: '/customers', label: 'Customer details', module: 'M1', icon: 'contact' },
      { href: '/accounts/new', label: 'New account', module: 'M2', icon: 'consent' },
    ],
  },
  {
    layer: 'reward',
    title: '2 · Remove the reward',
    items: [{ href: '/incentives', label: 'Incentives', module: 'M3', icon: 'coins' }],
  },
  {
    layer: 'detect',
    title: '3 · Detect',
    items: [
      { href: '/alerts', label: 'Conduct analytics', module: 'M4', icon: 'radar' },
      { href: '/speak-up', label: 'Speak-up channel', module: 'M5', icon: 'megaphone' },
    ],
  },
  {
    layer: 'govern',
    title: '4 · Govern',
    items: [
      { href: '/cases', label: 'Cases', module: 'M6', icon: 'briefcase' },
      { href: '/governance', label: 'Control governance', module: 'M7', icon: 'shield' },
    ],
  },
];

export const MODULE_LAYER = { M1: 'prevent', M2: 'prevent', M3: 'reward', M4: 'detect', M5: 'detect', M6: 'govern', M7: 'govern' };
