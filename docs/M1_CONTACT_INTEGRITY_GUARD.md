# M1 — Contact-Integrity Guard

**Layer:** 1 — Prevent

**Implementation status:** DEEP — fully interactive at `/customers` ("Customer Details"). The
page pairs the banker's "Branch Customer Servicing System" with the selected customer's
simulated phone (`components/CustomerPhone.js`). Rules live in `lib/contactRules.js`.

**Problem it addresses:** At Wells Fargo, employees used fake or staff-controlled contact
details (placeholder/shared emails, their own phone numbers) so customers never received account
notifications, and could set customer PINs themselves without the customer's involvement.

**Intended users / decisions supported:** Runs automatically on every staff-initiated
contact-detail change and PIN setup; compliance owns the configuration (blocked placeholder
patterns, staff email domain, cooling-off length).

**Data inputs:**
- Staff requests to change a customer's mobile or email (`ContactChangeRequest`)
- Staff mobile numbers (`Banker.mobile`) and the bank's staff email domain
- Every other customer's registered mobile/email (`Account.mobile`, `Account.email`)
- Customer replies on their existing mobile (YES / NO / no reply)
- Demo: seeded customers Chandra Wijaya (9123 4567) and Marcus Lee (8123 4567); bankers Alice
  Tan (9001 2233) and Ben Lim (9004 5566); one historical blocked attempt by Ben Lim

**Workflow / rules / analytical logic:**
- **Blocked outright** (logged as a HIGH `BLOCKED_CONTACT_CHANGE` alert against the banker and
  branch, and the customer is told on their existing mobile that a change was attempted):
  - a mobile number that belongs to a staff member
  - a mobile or email already registered to another customer
  - an email on the bank's own staff domain
  - a placeholder email (e.g. `noemail@…`, `test@…`, `…@example.com`)
- **Otherwise**, the change enters a 48-hour cooling-off period and an SMS goes to the
  customer's *existing* mobile (never the new one):
  - YES → applied immediately
  - NO → cancelled, HIGH `CONTACT_CHANGE_DISPUTED` alert against the banker and branch
  - no reply → applied after 48 hours (demo: presenter "Fast-forward 48 hours" control)
- **PINs:** the banker's screen has no PIN field. Staff can only send a secure setup link; the
  customer chooses and confirms the PIN on their own phone (`components/PinSetupScreen.js`). The
  PIN never leaves the phone simulation — the server only records that the customer set it.

**Outputs / alerts / escalation:**
- Blocked and disputed changes → `ConductAlert` (`source: "M1"`) on `/alerts`, escalatable into
  a Case (M6) like any other alert, and counted in the Board dashboard's open alerts
- Full per-customer contact-change history on the banker's screen (audit trail)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. % of planted fake/staff contact details
blocked in test data; false-positive rate on genuine changes; share of disputed changes)

**Status:** Built — `app/customers/page.js`, `lib/contactRules.js`,
`app/api/accounts/[id]/contact-change/route.js`, `app/api/contact-changes/[id]/route.js`,
`app/api/accounts/[id]/pin/route.js`, `app/api/accounts/[id]/route.js`,
`components/PinSetupScreen.js`, `components/usePhoneSimulator.js`, `prisma/schema.prisma`
(`ContactChangeRequest`, `Account.mobile/email/pinStatus`, `Banker.mobile`), migration
`20261028090000_m1_contact_integrity_guard`.
