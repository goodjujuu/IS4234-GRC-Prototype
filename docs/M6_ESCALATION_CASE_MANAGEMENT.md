# M6 — Escalation and Case Management

**Layer:** 4 — Govern

**Implementation status:** DEEP — fully interactive. View cases and their audit trail at
`/cases` and `/cases/[id]`, backed by `app/api/cases/*` routes.

**Problem it addresses:** Warning signs, including whistleblower reports, were not consolidated
into a board-level risk signal — each case was handled individually by branch managers and HR,
so the problem was never viewed at enterprise level.

**Intended users / decisions supported:** Second-line risk function, Conduct Office, Chief Risk
Officer (CRO); Board Risk and Audit Committees (summary view).

**Data inputs:**
- Flagged anomalies from M4 Conduct Analytics (a `Case` is always created from a `ConductAlert`
  via the escalate action)
- Retaliation flags and reports from M5 Speak-Up Channel (surfaced as `ConductAlert`s, escalated
  the same way)

**Workflow / rules / analytical logic:**
- Tiered escalation deadlines: Branch (5 days) → Conduct Office (48h) → CRO (24h), implemented
  in `app/api/alerts/[id]/escalate/route.js` (opens at Branch) and
  `app/api/cases/[id]/events/route.js` (`NEXT_LEVEL` / `NEXT_DEADLINE_HOURS` maps)
- Overdue cases are flagged in the UI (`/cases`, `/cases/[id]`) by comparing `deadlineAt` to
  now; in this build escalation past a missed deadline is a manual "Escalate to next tier"
  action rather than a background job, since there is no long-running server process in a
  serverless Next.js deployment — the demo seed includes one pre-made overdue case so the
  overdue state is visible without waiting
- Every action is time-stamped with evidence, forming an audit trail (`CaseEvent`)

**Outputs / alerts / escalation:**
- Case status and audit trail → feeds the Board conduct KRI dashboard (overdue cases, resolved
  cases)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. % of cases resolved within tiered
deadlines; overdue-case trend)

**Status:** Built — `app/cases/page.js`, `app/cases/[id]/page.js`, `app/api/cases/route.js`,
`app/api/cases/[id]/route.js`, `app/api/cases/[id]/events/route.js`,
`app/api/alerts/[id]/escalate/route.js`, `prisma/schema.prisma` (`Case`, `CaseEvent`).
