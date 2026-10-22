# M1 — Contact-Integrity Guard

**Layer:** 1 — Prevent

**Problem it addresses:** At Wells Fargo, employees used fake or staff-controlled contact
details (placeholder/shared emails) so customers never received account notifications, and
could set customer PINs themselves without the customer's involvement.

**Intended users / decisions supported:** Runs automatically on every contact-detail or PIN
change; compliance owns the configuration (blocked-domain list, cooling-off period length).

**Data inputs:**
- Customer contact-detail change events (phone, email)
- PIN-set events
- TODO: source system(s) — mock/synthetic data is acceptable for the demo

**Workflow / rules / analytical logic:**
- Any change to phone or email notifies the *old* contact and triggers a cooling-off period
  before the change takes effect
- Placeholder or shared email domains/patterns are blocked
- Only the customer — never a staff member — can set a PIN

**Outputs / alerts / escalation:**
- Blocked or suspicious attempt → logged against the banker and branch, feeds M4 Conduct
  Analytics

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. % of contact changes correctly flagged in
test data; false-positive rate)

**Status:** Not started
