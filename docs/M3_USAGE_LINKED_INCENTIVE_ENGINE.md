# M3 — Usage-Linked Incentive Engine

**Layer:** 2 — Remove the reward

**Implementation status:** DEEP — fully interactive at `/incentives`. The page pairs the bank's
"Incentive & Scorecard System" (banker view) with the selected customer's phone running their
own banking app (`components/BankingAppScreen.js`).

**Problem it addresses:** Sales credit was earned the moment an account was opened, regardless
of whether the customer ever used it — the incentive-design flaw that made opening unwanted
accounts profitable. Staff also moved money into new accounts and back out ("simulated
funding") so they looked active.

**Intended users / decisions supported:** Bankers (see what is held vs. credited); HR /
compensation and Conduct (scorecard weights, lapsed-credit review).

**Data inputs:**
- Account activation (from M2 — approval creates a `PROVISIONAL` `IncentiveEvent`)
- `Transaction` rows, tagged `initiatedBy: CUSTOMER | STAFF`
- Demo: Priya Raman (Ben Lim, day 20), Wei Jie Tan (Alice Tan, day 40, already used),
  Farah Ismail (Daniel Koh, day 12), Grace Lim (Chloe Ng, 370 days — due a retention bonus),
  Marcus Lee (Ben Lim, lapsed after staff transfer-and-reverse)

**Workflow / rules / analytical logic** (`lib/incentives.js`):
- Credit (S$50) is held as **provisional** from activation
- At the 90-day review: at least one customer-initiated transaction → **credited**
  ("New account creation incentive of S$50 credited to <banker>"); otherwise **lapsed** and a
  `UNUSED_ACCOUNT_90D` alert is raised (HIGH if the only activity was staff-initiated)
- Staff-initiated transfer-in + reversal never counts as use
- Accounts still open and used at 12 months earn a S$25 retention bonus
- Balanced scorecard: sales volume capped at 20%; usage 30%; customer outcomes 25%; conduct 25%

**Outputs / alerts / escalation:**
- Ledger of every provisional / credited / lapsed / bonus event per banker
- `UNUSED_ACCOUNT_90D` alerts → M4; lapsed rate → M4's `UNUSED_ACCOUNT_RATE` threshold and the
  Board's unused-account KRI; staff reversals → M4's `STAFF_FUNDING_REVERSALS` threshold

**Demo:** pick a provisional customer → tap "Pay by card" on their phone → "Fast-forward and
review" (+90 days) → green "incentive credited to <banker>" banner. Or press "Banker fakes
activity" first → the review lapses the credit and raises a HIGH alert.

**Ownership:** TODO — assign to a team member

**How effectiveness would be evaluated:** TODO (e.g. unused-account rate before/after;
share of lapsed credit linked to staff-initiated activity)

**Files:** `app/incentives/page.js`, `components/BankingAppScreen.js`, `lib/incentives.js`,
`app/api/incentives/route.js`, `app/api/incentives/review/route.js`,
`app/api/accounts/[id]/transactions/route.js`, `prisma/schema.prisma` (`Transaction`,
`IncentiveEvent`, `Account.incentiveAmount`).
