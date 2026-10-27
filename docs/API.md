# API routes

All routes are Next.js App Router route handlers under `app/api/`, returning JSON. No auth layer
— this is a course prototype, not a production system (see README "Known limitations").

| Method | Route | Purpose | Module |
|---|---|---|---|
| `GET` | `/api/branches` | List branches with their bankers | — |
| `GET` | `/api/accounts` | List accounts (branch/banker/consent included) | M2 |
| `POST` | `/api/accounts` | Open a new account; creates `Account` + `ConsentRequest` | M2 |
| `POST` | `/api/accounts/[id]/consent` | Resolve consent: `{ action: 'approve'\|'decline'\|'expire' }` | M2 → M4 |
| `GET` | `/api/accounts/[id]` | One account with its contact-change history | M1 |
| `POST` | `/api/accounts/[id]/contact-change` | Staff request to change mobile/email: `{ field: 'MOBILE'\|'EMAIL', value, bankerId }` → blocked + alert, or 48h cooling-off | M1 → M4 |
| `POST` | `/api/contact-changes/[id]` | Resolve a cooling-off change: `{ action: 'confirm'\|'cancel'\|'cooling-off-elapsed' }` | M1 → M4 |
| `POST` | `/api/accounts/[id]/pin` | `{ action: 'send-link'\|'customer-set' }` — staff can only send a link; the PIN itself never reaches the server | M1 |
| `GET` | `/api/alerts` | List conduct alerts (branch/banker/account/case included) | M4 |
| `POST` | `/api/alerts/[id]/escalate` | Escalate an alert into a Branch-level `Case` | M4 → M6 |
| `GET` | `/api/cases` | List cases with nested alert/branch/banker/events | M6 |
| `GET` | `/api/cases/[id]` | Single case detail with full audit trail | M6 |
| `POST` | `/api/cases/[id]/events` | `{ action: 'escalate'\|'resolve', actor, note }` | M6 |
| `GET` | `/api/kri` | Board conduct KRI summary (`lib/kri.js`) | M7 |
| `POST` | `/api/accounts/[id]/transactions` | `{ kind }` — customer use (`CARD_PAYMENT`, `SALARY_CREDIT`, `BILL_PAYMENT`) or demo `STAFF_FUND_AND_REVERSE` | M3 |
| `GET` | `/api/incentives` | Banker ledger totals, scorecard inputs, accounts, ledger events | M3 |
| `POST` | `/api/incentives/review` | Run the 90-day usage review: `{ fastForwardDays }` | M3 |
| `GET` | `/api/analytics` | Banker/branch risk map against governed thresholds | M4 |
| `POST` | `/api/analytics/run` | Run analytics and raise pattern alerts | M4 |
| `POST` | `/api/alerts/[id]/dismiss` | `{ reason, by }` — reason from a fixed list | M4 |
| `GET`/`POST` | `/api/reports` | List / file a speak-up report `{ theme, description, branchId, anonymous, reporterId }` | M5 |
| `POST` | `/api/reports/[id]` | `{ action: 'review'\|'adverse-action' }` | M5 |
| `POST` | `/api/cases/sweep` | SLA sweep with optional `{ fastForwardHours }` | M6 |
| `GET` | `/api/governance` | Thresholds, requests, chain verification, coverage, alert volume | M7 |
| `POST` | `/api/governance/requests` | Propose a threshold change (maker) | M7 |
| `POST` | `/api/governance/requests/[id]` | `{ action: 'approve'\|'reject', reviewer, note }` (checker) | M7 |
| `POST` | `/api/governance/verify` | Recompute the hash chain; raises an alert if broken | M7 |
| `POST` | `/api/governance/tamper` | Demo only: edit a past log entry directly | M7 |

## Notes

- `POST /api/accounts/[id]/consent` with `action: 'decline'` or `'expire'` creates a
  `ConductAlert` (`source: "M2"`) automatically — this is how a blocked consent shows up on
  `/alerts` without a separate call.
- `POST /api/alerts/[id]/escalate` opens the case at `BRANCH` (5 days) unless a routing rule
  applies: M5 alerts and repeat-pattern bankers start at `CONDUCT_OFFICE`, M7 alerts at `CRO`.
- `POST /api/cases/[id]/events` with `action: 'escalate'` moves `BRANCH → CONDUCT_OFFICE` (48h
  deadline) or `CONDUCT_OFFICE → CRO` (24h deadline); rejects with `409` if already at `CRO`.
- `POST /api/cases/[id]/events` also accepts `action: 'note'` to add evidence to the audit trail.
- Every write that changes a `Case`'s level or status appends a `CaseEvent`, which is the audit
  trail rendered on `/cases/[id]`.
