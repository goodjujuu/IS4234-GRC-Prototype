# API

All routes are in `app/api/`. Each checks the caller's role on the server and returns
`{ message }` on success or `{ error }` with a matching status.

| Route | Who | What it does |
| --- | --- | --- |
| `POST /api/auth/login`, `/logout` | Anyone | Starts or ends a demo session |
| `POST /api/cases/[id]` | Reviewer the case is routed to | `assign`, `start`, `note` or `close`. Closing needs an outcome and a reason, and is refused while a dispute is open. `TARGET_REVIEW` only applies to manager and target cases. Unusually fast reviews raise a warning sign |
| `POST /api/disputes` | Employee, own open case | Submits a dispute with optional supporting evidence |
| `POST /api/disputes/[id]` | Reviewer the case is routed to | `uphold` (closes the case as cleared and counts as a false alarm) or `reject` |
| `POST /api/appeals` | Employee, own closed case | Appeals the outcome to the audit committee |
| `POST /api/appeals/[id]` | Audit committee | `uphold` (overturns the outcome) or `reject` |
| `POST /api/speak-up` | Employee, team lead | Files an anonymous report with a one-way seal |
| `POST /api/dismissals` | Conduct risk, audit committee | Simulated HR feed, with no screen in the app. Opens a branch review and checks the retaliation guard |
| `POST /api/watchers/[id]` | Admins | Acknowledges a warning sign |
| `POST /api/watchers/verify` | Admins | Checks settings against the fixed baseline. A breach alerts internal audit |
| `POST /api/briefing` | Conduct risk | Generates a briefing, using the AI model if a key is set |
| `POST /api/briefing/[id]` | Conduct risk | `confirm` the AI draft, or `correct` it with new text |
| `GET /api/export/cases` | Admins | Audit trail as CSV |
| `GET /api/export/audit` | Admins | Audit export as PDF |
