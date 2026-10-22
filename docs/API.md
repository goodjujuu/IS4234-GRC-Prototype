# API sketch (placeholder)

Starter sketch only — adjust once the backend stack is chosen and modules are implemented.

| Endpoint | Purpose | Module |
|---|---|---|
| `POST /accounts/events` | Ingest an account-opening / contact-change / funding event | M1, M2 |
| `GET /accounts/{id}/status` | Consent + usage-linked incentive status for an account | M2, M3 |
| `GET /alerts` | List flagged conduct anomalies (filter by branch/banker/status) | M4 |
| `POST /reports` | Submit a speak-up / whistleblower report | M5 |
| `GET /cases` / `GET /cases/{id}` | Escalation case list / detail, with audit trail | M6 |
| `POST /config/thresholds` | Change a detection threshold (requires second-line sign-off) | M7 |
| `GET /kri` | Board conduct KRI summary (consent-decline rate, unused-account rate, etc.) | M6, M7 |

Default parameter values, auth, and request/response shapes: TODO once implemented.
