# M7 — Tamper-Evident Control Governance

**Layer:** 4 — Govern

**Problem it addresses:** At Wells Fargo, the business itself could pause or narrow sales
monitoring, and the board learned of the 5,300 dismissals only once they became public — the
monitoring system itself had no independent safeguard against being quietly weakened.

**Intended users / decisions supported:** Second-line risk function (sign-off on threshold
changes); Board Risk and Audit Committees (coverage assurance).

**Data inputs:**
- Threshold/configuration change events from M4 Conduct Analytics
- Alert-volume history (to detect suppression)

**Workflow / rules / analytical logic:**
- Any change to M4's detection thresholds requires second-line sign-off
- Hash-chained, append-only log of all configuration changes
- Automatic suppression alert if alert volumes drop unexpectedly
- Coverage report identifying blind spots (e.g. branches or account types with reduced
  monitoring)

**Outputs / alerts / escalation:**
- Threshold-change log and coverage report → Board conduct KRI dashboard

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. can a simulated attempt to quietly narrow
monitoring be detected and reported within a defined time window?)

**Status:** Not started
