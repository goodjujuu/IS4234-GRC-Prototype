# M3 — Usage-Linked Incentive Engine

**Layer:** 2 — Remove the reward

**Implementation status:** LIGHT — represented as seeded/logged demo data. `prisma/seed.js`
seeds one healthy `PAID` account and one `LAPSED` account (unused since activation), each with
the `incentiveStatus` field the full engine would compute on a real 90-day timer. The lapsed
account's `UNUSED_ACCOUNT_90D` alert is visible on `/alerts` and counts toward the Board
dashboard's unused-account-rate KRI.

**Problem it addresses:** Sales credit was earned the moment an account was opened, regardless
of whether the customer ever used it — the incentive-design flaw that made opening unwanted
accounts profitable for staff.

**Intended users / decisions supported:** Branch staff (see provisional vs. paid credit);
compliance/HR (configure the scorecard weighting).

**Data inputs:**
- Account activation events (from M2)
- Account usage/transaction activity
- Demo: `Account.incentiveStatus` (`PROVISIONAL` | `PAID` | `LAPSED`) seeded directly rather than
  computed from a real 90-day job

**Workflow / rules / analytical logic:**
- Sales credit is held as **provisional** once an account is active
- Paid out only if the account is genuinely used within 90 days, with a further bonus if still
  open at 12 months
- Scorecard is balanced and product-neutral — sales volume is never the dominant factor
- Accounts unused at 90 days → credit lapses, account flagged for review

**Outputs / alerts / escalation:**
- Unused-at-90-days flag → creates a `ConductAlert` (`source: "M3"`), feeds M4 Conduct
  Analytics; contributes to the unused-account-rate Board KRI (computed live in `lib/kri.js`)

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. unused-account rate before/after vs.
baseline; correlation between lapsed credit and subsequent misconduct flags)

**Status:** Represented via seeded data (see above); the KRI calculation itself
(`lib/kri.js:getKriSummary`) is live and recomputes from the real `Account` table.
