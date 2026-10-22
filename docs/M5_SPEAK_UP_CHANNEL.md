# M5 — Speak-Up Channel

**Layer:** 3 — Detect

**Implementation status:** LIGHT — represented as seeded/logged demo data. `prisma/seed.js`
creates two `Report` rows (one routine, one with `retaliationFlag: true`). Per the module flow,
the retaliation-flagged report also creates a `ConductAlert` (`source: "M5"`) so it visibly
feeds M4 Conduct Analytics on `/alerts`, not just a standalone complaints count.

**Problem it addresses:** The real-world whistleblower hotline routed complaints back through
the same regional management chain that benefited from the sales numbers — a structural
conflict of interest that suppressed escalation for years.

**Intended users / decisions supported:** Any employee (reporter); second-line risk function
and Audit Committee (recipients — not branch/business management).

**Data inputs:**
- Hotline report submissions — modelled as the `Report` table (`theme`, `description`,
  `status`, `retaliationFlag`)

**Workflow / rules / analytical logic:**
- Reports route directly to the second line of defence and the Audit Committee, bypassing
  branch/business management entirely
- Reports are grouped by theme
- Retaliation against reporters (e.g. a reporter's own performance flags spiking shortly after
  a report) is automatically flagged

**Outputs / alerts / escalation:**
- Reports feed M4 Conduct Analytics as an additional data source (counted in the Board
  dashboard's "Complaints logged" KRI); retaliation flags also create a `ConductAlert` so they
  can be escalated via M6 like any other conduct alert

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. time from report to independent review;
retaliation-flag false-positive rate)

**Status:** Represented via seeded data (see above); the resulting `ConductAlert` and KRI count
are live, computed from the real `Report`/`ConductAlert` tables.
