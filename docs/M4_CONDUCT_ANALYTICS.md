# M4 — Conduct Analytics

**Layer:** 3 — Detect

**Problem it addresses:** Data on complaints, dismissals and unused accounts was held
separately at Wells Fargo, so no one saw the full pattern — misconduct was treated as isolated
"gaming" rather than a systemic risk.

**Intended users / decisions supported:** Second-line risk function, branch/regional managers
(network view); feeds the Board conduct KRI pack.

**Data inputs:**
- Flags from M1 (contact-integrity blocks), M2 (consent declines/expiries), M3 (unused-at-90-
  days)
- Other data feeds: complaints, HR records, mystery-shopping results
- TODO: source system(s) — mock/synthetic data is acceptable for the demo

**Workflow / rules / analytical logic:**
- Flags red-flag patterns: unused accounts, transfer-then-reverse funding, declines, contact-
  detail anomalies
- Branch- and manager-level network view (aggregated at branch level first, for privacy)
- Complaint text analysis for theme grouping
- Detection thresholds are governed by M7 (second-line sign-off required to change them)

**Outputs / alerts / escalation:**
- Flagged anomalies → M6 Escalation and Case Management

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. precision/recall against labelled test
cases; time from pattern onset to first flag)

**Status:** Not started
