# M5 — Speak-Up Channel

**Layer:** 3 — Detect

**Implementation status:** DEEP — fully interactive at `/speak-up`. An employee's phone runs the
independent SpeakUp app (`components/SpeakUpAppScreen.js`); beside it are the second-line /
Audit Committee inbox and a locked branch-manager view.

**Problem it addresses:** The real hotline routed complaints back through the same regional
management that benefited from the sales numbers, and employees who spoke up faced retaliation.

**Intended users / decisions supported:** Any employee (reporter); second-line Risk and the
Audit Committee (the only recipients).

**Data inputs:** `Report` (theme, branch, description, anonymous / named reporter, tracking
code, retaliation flag); HR adverse-action events (simulated by a presenter control).

**Workflow / rules / analytical logic:**
- Reports route straight to second-line Risk & the Audit Committee; business-line managers
  cannot see, count or search them (shown as a locked dashboard)
- Anonymous by default; a tracking code lets the reporter follow up without revealing identity
- Grouped by theme so repeated concerns stand out
- A report themed "Retaliation", or an adverse HR action against a named reporter, raises a HIGH
  `RETALIATION_FLAGGED` alert automatically; anonymous reporters cannot be targeted
- Branch report counts feed M4's `SPEAK_UP_REPORTS` threshold

**Outputs / alerts / escalation:** retaliation alerts start at the Conduct Office in M6
(branch level skipped); report counts and retaliation flags → Board KRI pack.

**Ownership:** TODO · **Effectiveness:** TODO (time from report to independent review;
retaliation-flag false-positive rate)

**Files:** `app/speak-up/page.js`, `components/SpeakUpAppScreen.js`, `app/api/reports/route.js`,
`app/api/reports/[id]/route.js`, `prisma/schema.prisma` (`Report`).
