// Navigation by role, grouped by the three levels ConductGuard monitors.
export const LEVEL_DOTS = {
  overview: 'bg-slate-400',
  employee: 'bg-sky-500',
  manager: 'bg-amber-500',
  monitoring: 'bg-violet-500',
};

const notifications = { href: '/notifications', label: 'Notifications', icon: 'inbox', badge: 'unread' };

const OPEN = (title, items) => ({ level: 'overview', title, items });

const reporting = (extra = []) => OPEN('Risk reporting', [
  { href: '/overview', label: 'Live dashboard', icon: 'chart' },
  ...extra,
  { href: '/committee', label: 'Monthly summary', icon: 'layers' },
]);

export const NAV_BY_ROLE = {
  EMPLOYEE: [
    { level: 'employee', title: 'My conduct record', items: [
      { href: '/me', label: 'My dashboard', icon: 'user' },
      { href: '/me/data', label: 'Data held about me', icon: 'eye' },
    ] },
    { level: 'manager', title: 'Speak up', items: [{ href: '/speak-up', label: 'Protected speak-up', icon: 'megaphone' }] },
    OPEN('General', [notifications]),
  ],
  TEAM_LEAD: [
    { level: 'employee', title: 'My team', items: [
      { href: '/team', label: 'Team metrics', icon: 'chart' },
      { href: '/cases', label: 'Reviews', icon: 'briefcase' },
      { href: '/disputes', label: 'Disputes', icon: 'filter' },
    ] },
    { level: 'monitoring', title: 'Threshold Governance', items: [{ href: '/thresholds', label: 'Thresholds', icon: 'sliders' }] },
    { level: 'manager', title: 'Speak up', items: [{ href: '/speak-up', label: 'Protected speak-up', icon: 'megaphone' }] },
    OPEN('General', [notifications]),
  ],
  CONDUCT_RISK: [
    reporting([{ href: '/briefing', label: 'Morning briefing', icon: 'sparkles' }]),
    { level: 'employee', title: 'Employee conduct', items: [
      { href: '/employees', label: 'Employee profiles', icon: 'user' },
      { href: '/cases', label: 'Cases', icon: 'briefcase' },
      { href: '/disputes', label: 'Disputes', icon: 'filter' },
    ] },
    { level: 'manager', title: 'Managers and targets', items: [
      { href: '/pressure', label: 'Pressure Index', icon: 'radar' },
      { href: '/dismissals', label: 'Dismissals', icon: 'building' },
      { href: '/speak-up/reports', label: 'Speak-up reports', icon: 'megaphone' },
    ] },
    { level: 'monitoring', title: 'Threshold Governance', items: [
      { href: '/thresholds', label: 'Thresholds', icon: 'sliders' },
      { href: '/watchers', label: 'Warning signs', icon: 'shield' },
      { href: '/effectiveness', label: 'Effectiveness', icon: 'checkCircle' },
    ] },
    OPEN('General', [notifications]),
  ],
  CHIEF_RISK_OFFICER: [
    { level: 'monitoring', title: 'Threshold Governance', items: [
      { href: '/thresholds', label: 'Thresholds', icon: 'sliders' },
      { href: '/watchers', label: 'Warning signs', icon: 'shield' },
      { href: '/effectiveness', label: 'Effectiveness', icon: 'checkCircle' },
    ] },
    { level: 'employee', title: 'Cases', items: [
      { href: '/cases', label: 'Cases', icon: 'briefcase' },
      { href: '/disputes', label: 'Disputes', icon: 'filter' },
      { href: '/employees', label: 'Employee profiles', icon: 'user' },
    ] },
    reporting([{ href: '/pressure', label: 'Pressure Index', icon: 'radar' }]),
    OPEN('General', [notifications]),
  ],
  INTERNAL_AUDIT: [
    { level: 'monitoring', title: 'Threshold Governance', items: [
      { href: '/watchers', label: 'Warning signs', icon: 'shield' },
      { href: '/thresholds', label: 'Thresholds', icon: 'sliders' },
      { href: '/effectiveness', label: 'Effectiveness', icon: 'checkCircle' },
    ] },
    reporting([
      { href: '/briefing', label: 'Morning briefing', icon: 'sparkles' },
      { href: '/cases', label: 'Cases', icon: 'briefcase' },
      { href: '/employees', label: 'Employee profiles', icon: 'user' },
      { href: '/pressure', label: 'Pressure Index', icon: 'radar' },
    ]),
    OPEN('General', [notifications]),
  ],
  AUDIT_COMMITTEE: [
    OPEN('Committee', [
      { href: '/committee', label: 'Monthly summary', icon: 'layers' },
      { href: '/disputes', label: 'Appeals', icon: 'filter' },
      { href: '/cases', label: 'Escalated cases', icon: 'briefcase' },
    ]),
    OPEN('Evidence', [
      { href: '/overview', label: 'Live dashboard', icon: 'chart' },
      { href: '/pressure', label: 'Pressure Index', icon: 'radar' },
      { href: '/employees', label: 'Employee profiles', icon: 'user' },
      { href: '/dismissals', label: 'Dismissals', icon: 'building' },
      { href: '/speak-up/reports', label: 'Speak-up reports', icon: 'megaphone' },
      { href: '/watchers', label: 'Warning signs', icon: 'shield' },
      { href: '/effectiveness', label: 'Effectiveness', icon: 'checkCircle' },
    ]),
    OPEN('General', [notifications]),
  ],
};
