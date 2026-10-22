# M5 — Speak-Up Channel

**Layer:** 3 — Detect

**Problem it addresses:** The real-world whistleblower hotline routed complaints back through
the same regional management chain that benefited from the sales numbers — a structural
conflict of interest that suppressed escalation for years.

**Intended users / decisions supported:** Any employee (reporter); second-line risk function
and Audit Committee (recipients — not branch/business management).

**Data inputs:**
- Hotline report submissions
- TODO: source system(s) — mock/synthetic data is acceptable for the demo

**Workflow / rules / analytical logic:**
- Reports route directly to the second line of defence and the Audit Committee, bypassing
  branch/business management entirely
- Reports are grouped by theme
- Retaliation against reporters (e.g. a reporter's own performance flags spiking shortly after
  a report) is automatically flagged

**Outputs / alerts / escalation:**
- Reports feed M4 Conduct Analytics as an additional data source; retaliation flags escalate
  directly via M6

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. time from report to independent review;
retaliation-flag false-positive rate)

**Status:** Not started
