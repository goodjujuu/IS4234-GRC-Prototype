# M2 — Independent Consent Gate

**Layer:** 1 — Prevent

**Problem it addresses:** Account-opening systems recorded an account as a sale the moment it
was entered, with no independent proof the customer had authorised it — the core verification
gap in the case.

**Intended users / decisions supported:** Customer (approves/declines); compliance (reviews
declined/expired/dual-verification cases).

**Data inputs:**
- New account application events
- Customer registered phone number
- TODO: source system(s) — mock/synthetic data is acceptable for the demo

**Workflow / rules / analytical logic:**
- Customer must approve the account on their own registered phone before it is activated
- No reply within 7 days → application expires
- No phone on file → requires dual staff verification instead
- Declined or expired applications are blocked and logged against the specific banker and
  branch

**Outputs / alerts / escalation:**
- Declined/expired → feeds M4 Conduct Analytics (branch/banker pattern view)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. consent-decline rate tracked on the Board
KRI dashboard; time-to-expiry distribution)

**Status:** Not started
