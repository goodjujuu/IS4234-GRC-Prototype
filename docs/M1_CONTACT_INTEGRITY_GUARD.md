# M1 — Contact-Integrity Guard

**Layer:** 1 — Prevent

**Implementation status:** LIGHT — represented as seeded/logged demo data rather than a full
interactive workflow, per the group's build-scope decision (deep on M2, M4, M6 and the Board
dashboard; light on M1, M3, M5, M7). A blocked contact-change event is seeded in
`prisma/seed.js` and appears as a conduct alert (`source: "M1"`) on the Alerts page
(`app/alerts/page.js`), feeding M4 exactly as the real module would.

**Problem it addresses:** At Wells Fargo, employees used fake or staff-controlled contact
details (placeholder/shared emails) so customers never received account notifications, and
could set customer PINs themselves without the customer's involvement.

**Intended users / decisions supported:** Runs automatically on every contact-detail or PIN
change; compliance owns the configuration (blocked-domain list, cooling-off period length).

**Data inputs:**
- Customer contact-detail change events (phone, email)
- PIN-set events
- Demo: one blocked `BLOCKED_CONTACT_CHANGE` event seeded against Riverside Branch / Ben Lim

**Workflow / rules / analytical logic:**
- Any change to phone or email notifies the *old* contact and triggers a cooling-off period
  before the change takes effect
- Placeholder or shared email domains/patterns are blocked
- Only the customer — never a staff member — can set a PIN

**Outputs / alerts / escalation:**
- Blocked or suspicious attempt → logged against the banker and branch, feeds M4 Conduct
  Analytics (visible on `/alerts`, escalatable into a Case like any other alert)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. % of contact changes correctly flagged in
test data; false-positive rate)

**Status:** Represented via seeded data (see above). Not built as an interactive flow.
