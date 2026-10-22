# M2 — Independent Consent Gate

**Layer:** 1 — Prevent

**Implementation status:** DEEP — fully interactive. Open an account at `/accounts/new`, then
simulate the customer's response (approve / decline / no-reply-expire). Backed by
`app/api/accounts/route.js` (create) and `app/api/accounts/[id]/consent/route.js` (resolve).

**Problem it addresses:** Account-opening systems recorded an account as a sale the moment it
was entered, with no independent proof the customer had authorised it — the core verification
gap in the case.

**Intended users / decisions supported:** Customer (approves/declines); compliance (reviews
declined/expired/dual-verification cases).

**Data inputs:**
- New account application events (`Account` + nested `ConsentRequest` created together)
- Customer registered phone number (demo assumes one is on file, defaulting the channel to
  `SMS`; a missing phone would route to `DUAL_STAFF`)

**Workflow / rules / analytical logic:**
- Customer must approve the account on their own registered phone before it is activated
- No reply within 7 days → application expires (modelled in the demo as an explicit "No reply
  (expire)" action rather than a real 7-day timer)
- No phone on file → requires dual staff verification instead
- Declined or expired applications are blocked (`Account.status` set to `DECLINED`/`EXPIRED`)
  and logged against the specific banker and branch

**Outputs / alerts / escalation:**
- Declined/expired → creates a `ConductAlert` (`source: "M2"`) that feeds M4 Conduct Analytics
  (branch/banker pattern view) and the Board dashboard's consent-decline-rate KRI

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. consent-decline rate tracked on the Board
KRI dashboard; time-to-expiry distribution)

**Status:** Built — `app/accounts/new/page.js`, `app/api/accounts/route.js`,
`app/api/accounts/[id]/consent/route.js`, `prisma/schema.prisma` (`Account`, `ConsentRequest`).
