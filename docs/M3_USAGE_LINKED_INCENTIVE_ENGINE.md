# M3 — Usage-Linked Incentive Engine

**Layer:** 2 — Remove the reward

**Problem it addresses:** Sales credit was earned the moment an account was opened, regardless
of whether the customer ever used it — the incentive-design flaw that made opening unwanted
accounts profitable for staff.

**Intended users / decisions supported:** Branch staff (see provisional vs. paid credit);
compliance/HR (configure the scorecard weighting).

**Data inputs:**
- Account activation events (from M2)
- Account usage/transaction activity
- TODO: source system(s) — mock/synthetic data is acceptable for the demo

**Workflow / rules / analytical logic:**
- Sales credit is held as **provisional** once an account is active
- Paid out only if the account is genuinely used within 90 days, with a further bonus if still
  open at 12 months
- Scorecard is balanced and product-neutral — sales volume is never the dominant factor
- Accounts unused at 90 days → credit lapses, account flagged for review

**Outputs / alerts / escalation:**
- Unused-at-90-days flag → feeds M4 Conduct Analytics; contributes to the unused-account-rate
  Board KRI

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. unused-account rate before/after vs.
baseline; correlation between lapsed credit and subsequent misconduct flags)

**Status:** Not started
