# M6 — Escalation and Case Management

**Layer:** 4 — Govern

**Implementation status:** DEEP — fully interactive at `/cases` (board by tier) and
`/cases/[id]` (tier stepper, audit trail, actions).

**Problem it addresses:** Warning signs were handled one by one by branch managers and HR and
never consolidated into a board-level risk signal.

**Intended users / decisions supported:** Branch managers, Conduct Office, Chief Risk Officer;
the Board (overdue and board-notified counts).

**Data inputs:** alerts from M1–M5 and M7.

**Workflow / rules / analytical logic:**
- Tiered SLA: Branch 5 days → Conduct Office 48h → CRO 24h
- **SLA sweep** (`app/api/cases/sweep`): any case past its deadline escalates automatically with
  a "System (SLA sweep)" audit entry; a missed CRO deadline is reported to the Board. Presenter
  controls fast-forward time by 2 or 5 days to show this live.
- Routing rules when a case opens: speak-up/retaliation alerts skip the branch; control-tampering
  alerts go straight to the CRO; a banker with another case in the last 180 days skips the branch
  (repeat pattern)
- Every action (open, escalate, note/evidence, resolve) is a timestamped `CaseEvent` recorded
  against the acting role

**Outputs / alerts / escalation:** case status, overdue and board-notified counts → Board KRI
pack.

**Ownership:** TODO · **Effectiveness:** TODO (% resolved within SLA; overdue trend)

**Files:** `app/cases/page.js`, `app/cases/[id]/page.js`, `app/api/cases/route.js`,
`app/api/cases/[id]/route.js`, `app/api/cases/[id]/events/route.js`,
`app/api/cases/sweep/route.js`, `app/api/alerts/[id]/escalate/route.js`.
