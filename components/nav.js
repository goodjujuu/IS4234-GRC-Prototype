// Navigation by role, grouped by the three levels ConductGuard monitors.
export const LEVEL_DOTS = {
  overview: 'bg-slate-400',
  employee: 'bg-sky-500',
  manager: 'bg-amber-500',
  monitoring: 'bg-violet-500',
};

const OPEN = (title, items) => ({ level: 'overview', title, items });

export const NAV_BY_ROLE = {
  EMPLOYEE: [
    { level: 'employee', title: 'My Conduct Record', items: [
      { href: '/me', label: 'My Dashboard', icon: 'user' },
      { href: '/me/disputes', label: 'Disputes and Appeals', icon: 'filter' },
      { href: '/me/data', label: 'My Personal Data', icon: 'eye' },
    ] },
    { level: 'manager', title: 'Speak Up', items: [{ href: '/speak-up', label: 'Protected Speak-Up', icon: 'megaphone' }] },
  ],
  TEAM_LEAD: [
    { level: 'employee', title: 'My Team', items: [
      { href: '/team', label: 'My Team', icon: 'user' },
      { href: '/cases', label: 'Reviews', icon: 'briefcase' },
    ] },
    { level: 'monitoring', title: 'Threshold Governance', items: [{ href: '/thresholds', label: 'Thresholds', icon: 'sliders' }] },
    { level: 'manager', title: 'Speak Up', items: [{ href: '/speak-up', label: 'Protected Speak-Up', icon: 'megaphone' }] },
  ],
  CONDUCT_RISK: [
    OPEN('Risk Reporting', [
      { href: '/briefing', label: 'Morning Briefing', icon: 'sparkles' },
      { href: '/overview', label: 'Live Dashboard', icon: 'chart' },
    ]),
    OPEN('Case Management', [{ href: '/cases', label: 'Cases', icon: 'briefcase' }]),
    { level: 'employee', title: 'Employee Conduct', items: [{ href: '/employees', label: 'Employees', icon: 'user' }] },
    { level: 'manager', title: 'Managers and Targets', items: [{ href: '/pressure', label: 'Pressure Index', icon: 'radar' }] },
    { level: 'monitoring', title: 'Threshold Governance', items: [{ href: '/thresholds', label: 'Thresholds', icon: 'sliders' }] },
  ],
  CHIEF_RISK_OFFICER: [
    OPEN('Case Management', [{ href: '/cases', label: 'Escalated Cases', icon: 'briefcase' }]),
    { level: 'monitoring', title: 'Threshold Governance', items: [{ href: '/thresholds', label: 'Thresholds', icon: 'sliders' }] },
  ],
  INTERNAL_AUDIT: [
    { level: 'monitoring', title: 'Threshold Governance', items: [
      { href: '/watchers', label: 'Warning Signs', icon: 'shield' },
      { href: '/thresholds', label: 'Thresholds', icon: 'sliders' },
    ] },
    OPEN('Risk Reporting', [{ href: '/effectiveness', label: 'Effectiveness', icon: 'checkCircle' }]),
    OPEN('Case Management', [{ href: '/cases', label: 'Cases', icon: 'briefcase' }]),
  ],
  AUDIT_COMMITTEE: [
    OPEN('Risk Reporting', [{ href: '/committee', label: 'Monthly Summary', icon: 'layers' }]),
    OPEN('Case Management', [
      { href: '/cases', label: 'Escalated Cases', icon: 'briefcase' },
      { href: '/disputes', label: 'Appeals', icon: 'filter' },
    ]),
    { level: 'manager', title: 'Managers and Targets', items: [{ href: '/speak-up/reports', label: 'Speak-Up Reports', icon: 'megaphone' }] },
  ],
};
