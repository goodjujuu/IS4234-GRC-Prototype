# M7 — Tamper-Evident Control Governance

**Layer:** 4 — Govern

**Implementation status:** LIGHT — represented as seeded/logged demo data. `prisma/seed.js`
creates one `ConfigChangeLog` entry (a threshold change with a changed-by/signed-off-by pair
and a demo hash), rendered on the Board dashboard (`/board`) as the "threshold/config change
log" table — this is the module's visible output, even though the full workflow (an admin UI
for proposing and approving threshold changes) was out of scope for this build.

**Problem it addresses:** At Wells Fargo, the business itself could pause or narrow sales
monitoring, and the board learned of the 5,300 dismissals only once they became public — the
monitoring system itself had no independent safeguard against being quietly weakened.

**Intended users / decisions supported:** Second-line risk function (sign-off on threshold
changes); Board Risk and Audit Committees (coverage assurance).

**Data inputs:**
- Threshold/configuration change events from M4 Conduct Analytics — modelled as the
  `ConfigChangeLog` table (`change`, `changedBy`, `signedOffBy`, `hash`)
- Alert-volume history (to detect suppression) — not separately computed in this build; the
  Board dashboard's "Open conduct alerts" KRI is the closest live proxy

**Workflow / rules / analytical logic:**
- Any change to M4's detection thresholds requires second-line sign-off
- Hash-chained, append-only log of all configuration changes (demo uses a simple non-cryptographic
  hash stand-in — `fakeHash()` in `prisma/seed.js` — to demonstrate the concept without adding a
  crypto dependency; a production build would use a real SHA-256 chain)
- Automatic suppression alert if alert volumes drop unexpectedly — not built; noted as a known
  limitation
- Coverage report identifying blind spots (e.g. branches or account types with reduced
  monitoring) — not built; noted as a known limitation

**Outputs / alerts / escalation:**
- Threshold-change log → Board conduct KRI dashboard (`/board`)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. can a simulated attempt to quietly narrow
monitoring be detected and reported within a defined time window?)

**Status:** Represented via seeded data + a live read (`lib/kri.js` fetches the real
`ConfigChangeLog` rows for `/board`). Sign-off workflow and suppression/coverage alerts are not
built — see "Known limitations" in the README.
