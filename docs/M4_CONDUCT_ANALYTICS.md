# M4 — Conduct Analytics

**Layer:** 3 — Detect

**Implementation status:** DEEP — fully interactive at `/alerts` ("Conduct analytics"), with a
**Risk map** tab and an **Alert queue** tab.

**Problem it addresses:** Complaints, dismissals and unused accounts were held separately at
Wells Fargo, so no one saw the full pattern — misconduct was treated as isolated "gaming".

**Intended users / decisions supported:** Second-line risk / Conduct Office (triage, escalate,
dismiss); feeds the Board KRI pack.

**Data inputs** (`lib/analytics.js`): per banker — consent declined/ignored rate (M2), unused
after 90 days rate (M3), blocked or disputed contact changes (M1), staff transfer-and-reverse
fundings (M3); per branch — speak-up reports in 90 days (M5). Thresholds come from the
`Threshold` table, changeable only through M7.

**Workflow / rules / analytical logic:**
- Risk map: every banker's metrics against the governed thresholds; red cells breach; risk score
  = number of breached thresholds (0–4). Branch view aggregates first, for privacy.
- "Run analytics now" raises one `BANKER_PATTERN` / `BRANCH_PATTERN` alert per breaching banker
  or branch (no duplicates while one is open) and records an `AnalyticsRun` (feeds M7 coverage).
- Alert queue: filter by source module and status; **Escalate to case** (→ M6) or **Dismiss**
  with a mandatory reason from a fixed list — dismissals are reported to the Board by reason.

**Outputs / alerts / escalation:** pattern alerts; escalations open M6 cases; dismissals by
reason → Board.

**Demo:** with fresh seed data, Ben Lim breaches all 4 banker thresholds and Riverside breaches
the speak-up threshold. "Run analytics now" raises a new HIGH alert for Ben.

**Ownership:** TODO · **Effectiveness:** TODO (precision/recall on labelled test cases; time from
pattern onset to first flag)

**Files:** `app/alerts/page.js`, `lib/analytics.js`, `lib/thresholds.js`,
`app/api/analytics/route.js`, `app/api/analytics/run/route.js`, `app/api/alerts/route.js`,
`app/api/alerts/[id]/dismiss/route.js`, `app/api/alerts/[id]/escalate/route.js`.
