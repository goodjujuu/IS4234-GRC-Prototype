# API routes

All routes are Next.js App Router route handlers under `app/api/`, returning JSON. No auth layer
— this is a course prototype, not a production system (see README "Known limitations").

| Method | Route | Purpose | Module |
|---|---|---|---|
| `GET` | `/api/branches` | List branches with their bankers | — |
| `GET` | `/api/accounts` | List accounts (branch/banker/consent included) | M2 |
| `POST` | `/api/accounts` | Open a new account; creates `Account` + `ConsentRequest` | M2 |
| `POST` | `/api/accounts/[id]/consent` | Resolve consent: `{ action: 'approve'\|'decline'\|'expire' }` | M2 → M4 |
| `GET` | `/api/alerts` | List conduct alerts (branch/banker/account/case included) | M4 |
| `POST` | `/api/alerts/[id]/escalate` | Escalate an alert into a Branch-level `Case` | M4 → M6 |
| `GET` | `/api/cases` | List cases with nested alert/branch/banker/events | M6 |
| `GET` | `/api/cases/[id]` | Single case detail with full audit trail | M6 |
| `POST` | `/api/cases/[id]/events` | `{ action: 'escalate'\|'resolve', actor, note }` | M6 |
| `GET` | `/api/kri` | Board conduct KRI summary (`lib/kri.js`) | M7 |

## Notes

- `POST /api/accounts/[id]/consent` with `action: 'decline'` or `'expire'` creates a
  `ConductAlert` (`source: "M2"`) automatically — this is how a blocked consent shows up on
  `/alerts` without a separate call.
- `POST /api/alerts/[id]/escalate` always opens the case at `level: "BRANCH"` with a 5-day
  deadline; rejects with `409` if the alert already has a case.
- `POST /api/cases/[id]/events` with `action: 'escalate'` moves `BRANCH → CONDUCT_OFFICE` (48h
  deadline) or `CONDUCT_OFFICE → CRO` (24h deadline); rejects with `409` if already at `CRO`.
- Every write that changes a `Case`'s level or status appends a `CaseEvent`, which is the audit
  trail rendered on `/cases/[id]`.
