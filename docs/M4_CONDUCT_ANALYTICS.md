# M4 — Conduct Analytics

**Layer:** 3 — Detect

**Implementation status:** DEEP — fully interactive. View and escalate alerts at `/alerts`,
backed by `app/api/alerts/route.js` and `app/api/alerts/[id]/escalate/route.js`.

**Problem it addresses:** Data on complaints, dismissals and unused accounts was held
separately at Wells Fargo, so no one saw the full pattern — misconduct was treated as isolated
"gaming" rather than a systemic risk.

**Intended users / decisions supported:** Second-line risk function, branch/regional managers
(network view); feeds the Board conduct KRI pack.

**Data inputs:**
- Flags from M1 (contact-integrity blocks), M2 (consent declines/expiries), M3 (unused-at-90-
  days), M5 (retaliation-flagged reports) — all land in the single `ConductAlert` table, tagged
  by `source`
- Other data feeds: complaints, HR records, mystery-shopping results (represented by the
  `Report` model / seeded data, not separately integrated in this build)

**Workflow / rules / analytical logic:**
- Flags red-flag patterns: unused accounts, transfer-then-reverse funding, declines, contact-
  detail anomalies
- Branch- and manager-level network view (aggregated at branch level first, for privacy)
- Complaint text analysis for theme grouping (represented by `Report.theme`, not NLP in this
  build)
- Detection thresholds are governed by M7 (second-line sign-off required to change them) — in
  this build, represented by the `ConfigChangeLog` table and the Board dashboard's change log,
  rather than a live threshold-editing UI

**Outputs / alerts / escalation:**
- Flagged anomalies → M6 Escalation and Case Management (`/alerts` → "Escalate" button →
  `app/api/alerts/[id]/escalate/route.js` opens a `Case`)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. precision/recall against labelled test
cases; time from pattern onset to first flag)

**Status:** Built — `app/alerts/page.js`, `app/api/alerts/route.js`,
`app/api/alerts/[id]/escalate/route.js`, `prisma/schema.prisma` (`ConductAlert`).
