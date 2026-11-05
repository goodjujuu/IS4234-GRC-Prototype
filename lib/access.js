// Who may see and act on a case. Used by both the case page and its API route, so the
// rules are enforced on the server and not just hidden in the UI.

export function canViewCase(user, c) {
  if (['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT'].includes(user.role)) return true;
  if (user.role === 'AUDIT_COMMITTEE') return c.inCommitteeSummary || c.tier === 'AUDIT_COMMITTEE';
  if (user.role === 'TEAM_LEAD') return c.tier === 'TEAM_LEAD' && c.branchId === user.branchId && c.employeeId !== user.employeeId;
  return false;
}

export function canActOnCase(user, c) {
  if (c.status === 'CLOSED') return false;
  if (user.role === 'TEAM_LEAD') return c.tier === 'TEAM_LEAD' && c.branchId === user.branchId && c.employeeId !== user.employeeId;
  if (user.role === 'CONDUCT_RISK') return c.tier === 'TEAM_LEAD' || c.tier === 'CONDUCT_RISK';
  if (user.role === 'CHIEF_RISK_OFFICER') return c.tier === 'CHIEF_RISK_OFFICER';
  if (user.role === 'AUDIT_COMMITTEE') return c.tier === 'AUDIT_COMMITTEE';
  return false;
}

// Team leads see their own team only. Employees use /me, not the admin profile.
export function canViewEmployee(user, employee) {
  if (['CONDUCT_RISK', 'CHIEF_RISK_OFFICER', 'INTERNAL_AUDIT', 'AUDIT_COMMITTEE'].includes(user.role)) return true;
  return user.role === 'TEAM_LEAD' && employee.branchId === user.branchId;
}
