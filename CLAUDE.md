# IS4234 Group 26 Prototype: ConductGuard

> Current prototype scope, 13 November 2026. Weights and thresholds are fixed and read-only.
> Proposal submission, approval, rejection, justification and related reporting are removed.
> This scope supersedes the proposal workflow and six-role design described below. The Chief
> Risk Officer role is removed, and overdue conduct-risk cases route directly to the audit
> committee. Configuration checks compare live settings with `DEFAULT_CONFIG`, and
> independent warning signs remain. Hash-chain logic and configuration-log displays are removed.
> A targeted migration removes legacy proposal and configuration-log storage and obsolete records.
> AI summaries are informational overviews without a manual confirmation or correction step.
> See `USER_GUIDE.md` for the current walkthrough.

This is the technology demonstrator for NUS IS4234 Group 26's report on the Wells Fargo
cross-selling scandal (GRC case study). The product is **ConductGuard**, an observability platform
for conduct risk in retail banking.

**`solution.md` is the source of truth for what the application does, and this file summarises it
for building.** If the two disagree, `solution.md` wins.

## Stack and layout

Single Next.js 15 app (App Router, JavaScript — not TypeScript), Tailwind CSS, Prisma ORM
against Postgres, deployed on Vercel. No separate `backend/`/`frontend/` split — pages, API
routes and data access all live in one project:

- `app/` — pages (`page.js`) and API route handlers (`app/api/**/route.js`)
- `components/` — `ui.js` (shared primitives), `nav.js` (navigation by role), `actions.js` (forms that call the API)
- `lib/scoring.js`, `pressure.js`, `engine.js`, `briefing.js` — the engine. These are
  CommonJS so `prisma/seed.js` runs the same code as the app
- `lib/kri.js` — dashboard and effectiveness numbers
- `lib/access.js` — who can see and act on a case
- `lib/session.js` — demo logins and server-side role checks
- `prisma/` — `schema.prisma`, `seed.js`

## Conventions

- No TypeScript — keep new files `.js`/`.jsx`, not `.ts`/`.tsx`.
- Mock/synthetic, committed seed data only (`prisma/seed.js`) — no live external data sync, so
  demo/grading runs are reproducible. Any new seed data goes there, not hard-coded into pages.
  Employee, manager and branch names must be fictional.
- The seed uses a fixed random seed and a demo clock (`DemoClock`). Time-based logic reads the demo
  clock through `getNow`, never `Date.now()`.
- Access is role-based with at least one demo login per role (see "Users and access").
- Staff systems use `SystemWindow`. There are no presenter or demo-only controls in the UI, and no
  notifications page.
- Shared UI primitives are in `components/ui.js` (PageHeader, Card, Badge, Button, Callout,
  StatCard…) and navigation in `components/nav.js`; use them rather than ad-hoc styling.
- Server-side rules (approval, routing, deadlines, scoring) live in the API routes and `lib/`, not
  just the UI.
- Every Prisma write that changes a `Case`'s status or level appends a `CaseEvent`. That table is
  the audit trail the UI renders: every action must be time-stamped with evidence.
- `lib/kri.js` is the single source of truth for dashboard KRIs and effectiveness metrics —
  compute new ones there, not inline in pages.
- The app reads as a product. UI text explains how to use the page, and case-study commentary (Wells
  Fargo, the course, why a design was chosen) belongs in the report, guide or `README.md`, not the
  UI. Keep code comments about the code.
- Every page has a `PageHeader` `description` of exactly one sentence saying what the page is for.

## Project context

NUS module IS4234 (Governance, Regulation, and Compliance Technology), Group 26.

Case: the Wells Fargo cross-selling (fake accounts) scandal, 2002–2016. Employees opened ~3.5M
potentially unauthorised accounts to meet sales targets. Root causes: pressure from unachievable
targets, the business policing its own conduct risk, siloed warning signs (complaints, ~5,300
dismissals) never reaching the board, and monitoring that management paused and narrowed
(flagging only the top 0.01% of employees).

## Unique proposition

ConductGuard targets the sales pressure created by managers and targets, not only the behaviour of
employees. Existing solutions (EY's banker surveillance, NICE Actimize, Behavox) mainly ask which
employees are breaking the rules. Wells Fargo monitored employees and dismissed about 5,300 of them,
yet the misconduct continued because its real driver was pressure. ConductGuard links each
employee's conduct to the manager and target behind it.

The platform has three functions: **Conduct Surveillance**, **Alerting and Case Management** and
**Risk Reporting**.

## Scope

- Not a production system. Build just enough functionality to show the value and how it addresses
  the problem. Synthetic data only.
- **Out of scope:** account creation, customer verification, consent flows, any customer-facing
  features. The platform only reads account activity the bank already records.

## Users and access (role-based)

- **Employee:** own metrics, explanations, disputes, appeals, notifications.
- **Team lead (branch manager):** own team only. Reviews Medium cases. Cannot change thresholds.
- **Conduct risk team:** whole bank. Reviews High, manager, target and dismissal cases. Proposes
  threshold changes. Receives the morning briefing.
- **Chief Risk Officer:** approves or rejects threshold proposals. Receives High cases not reviewed
  within 48 hours.
- **Internal audit (third line):** whole bank, read-only. Receives every warning sign and threshold
  change. Checks flags were reviewed on time and properly decided.
- **Audit committee:** monthly summary, appeals, second High cases, speak-up reporter cases.

Provide at least one demo login per role.

## Conduct Surveillance

### Level 1, Employee Conduct (scored daily)

| Metric | Definition | Why it is tracked |
| --- | --- | --- |
| Accounts opened | Number of accounts opened per week | Unusually high volume can signal sales pressure |
| Unused account rate | Share of new accounts with no genuine customer activity within 90 days | Most unauthorised accounts were never used by the customer |
| Internal transfer funding rate | Share of new accounts funded only by moving money from the same customer's existing account | Staff moved customer money to make new accounts look funded |
| Early closure rate | Share of new accounts closed within 60 days | Customers closed accounts they never asked for once they found them |
| Contact detail changes | Customer email or phone changes made by the employee around the time an account was opened | Staff used false contact details so customers would not learn of new accounts |
| Customer complaint rate | Complaints linked to the employee's accounts, with "did not authorise" weighted highest | Complaints were never traced back to the employees involved |
| Same-day multiple products | Customers given several products by the same employee on the same day | A common pattern under cross-selling pressure |

- Each metric is compared with peers in the same role and branch, then combined into a risk score
  from 0 to 100. Implementation note: the higher of two peer comparisons counts, same role across
  the bank and same role within the branch, so a whole branch under pressure cannot look normal
  against itself.
- Unused accounts, internal transfer funding and "did not authorise" complaints carry the highest
  weights.
- The score also rises with the number of customers affected, so it reflects harm as well as
  likelihood.

| Risk level | Score | Action |
| --- | --- | --- |
| Low | 0 to 39 | Shown on the dashboard only |
| Medium | 40 to 69 | Case opened for the team lead |
| High | 70 to 100 | Case opened for the conduct risk team and reported to the audit committee |

### Level 2, Managers and Targets

These combine into a **Pressure Index** from 0 to 100 for each branch and manager.

| Metric | Definition | Why it is tracked |
| --- | --- | --- |
| Target miss rate | Share of branch staff missing their sales targets | When most staff cannot meet a target, the target is the problem, not the staff |
| Target increases | Size and frequency of recent increases to branch targets | Wells Fargo kept raising targets even as staff struggled to meet them |
| End-of-month sales spikes | Sharp rises in accounts opened in the last days of a sales period | Staff rushed to hit targets before deadlines |
| Pressure reports | Number of anonymous reports from staff about pressure at the branch | Staff warnings about pressure were ignored |
| Team flag rate | Share of the manager's staff rated Medium or High | Widespread flags in one team point to the manager, not individuals |
| Manager response time | How quickly the manager acts on flags raised in their team | Managers tolerated or encouraged the behaviour |
| Sales misconduct dismissals | Number of staff dismissed for sales misconduct at the branch | About 5,300 dismissals were never treated as a pattern |

The key link: when a branch has a high Pressure Index and rising employee flags, the manager and the
target are flagged for review, not only the employees. A branch is rated **High when its Pressure
Index is 70 or more, or when at least 30 percent of its staff are rated High.**

Speak-up reports are anonymous. A report stores a one-way seal, not a name, so the system can
recognise a reporter who is later flagged or dismissed.

### Level 3, Threshold Governance

1. **Controlling who can change thresholds.** Only the conduct risk team can propose a change to
   thresholds or weights, and the Chief Risk Officer must approve it. No one can approve their own
   proposal. Branch managers and team leads cannot make changes at all. Every change goes to a
   permanent log with who made it, the old and new values and the reason. The log cannot be edited
   (hash-chained, so any edit is detected).
2. **Detecting signs that detection is being weakened.**

| Warning sign | Example | What it may indicate |
| --- | --- | --- |
| Threshold change attempted | A branch manager tries to raise the High threshold from 70 to 85 | An attempt to reduce the number of flagged staff |
| Unapproved change | A threshold change that skipped approval | A breach of the two-person rule. The target is zero |
| Sudden drop in flags | Flags fall by half in one month while sales volumes stay the same | Detection was turned down, not that misconduct stopped |
| Unusually fast reviews | A team lead clears twenty cases in one hour | Flags are being dismissed without real checks |

3. **Alerting an independent party.** Every warning sign, and every threshold change whether approved
   or blocked, alerts internal audit, not the business line involved.

## Alerting and Case Management

| What is flagged | Alert sent to | Review deadline |
| --- | --- | --- |
| Employee rated Medium | Team lead | 5 working days |
| Employee rated High | Conduct risk team | 48 hours |
| Branch or manager rated High on the Pressure Index | Conduct risk team | 5 working days |
| Dismissal for sales misconduct | Conduct risk team | 5 working days |
| Speak-up reporter later flagged or dismissed | Audit committee | Immediate |
| Threshold change attempt or control breach | Internal audit | Immediate |

- Employees are notified whenever their own risk level changes.
- Cases about managers and targets go to the conduct risk team, because a branch cannot independently
  review the pressure it creates.
- **Case workflow:** the platform opens each case automatically, attaches the evidence (the metrics
  that passed the threshold and the specific accounts behind them), assigns a named reviewer and
  starts the deadline. The reviewer records an outcome with a written reason.
- **Outcomes:** cleared, coaching or investigation. Manager and target cases have a fourth outcome,
  target review, which sends the target for adjustment.
- **Escalation:** a Medium case not reviewed within 5 working days moves to the conduct risk team. A
  High case not reviewed within 48 hours moves to the Chief Risk Officer. A second High case for the
  same employee or branch within six months goes to the audit committee, as does any case involving
  a speak-up reporter.
- **Disputes:** the employee receives a plain-language explanation of which metrics passed the
  threshold and why they matter. They can submit a dispute with supporting evidence, which the
  reviewer must consider before deciding. If they disagree with the outcome, they can appeal to the
  audit committee. An upheld dispute is a false alarm. If false alarms build up, conduct risk can
  propose adjusting the weights, which must still pass through Threshold Governance.
- **Audit trail:** every action records the time, the person and the evidence. It cannot be edited
  and can be exported (CSV and PDF).

## Risk Reporting

- **Live dashboard:** heat map by branch and team, highest-risk employees and branches first,
  drill-down from a branch to an employee, metrics over time compared with peers, the accounts
  behind each flag, and the Pressure Index next to employee risk. Each user sees only what their role
  allows. Team leads see their own team. Conduct risk and internal audit see the whole bank.
- **Daily morning briefing (conduct risk team, a page in the app):** new Medium and High cases, overdue
  reviews, branches with a rising Pressure Index, threshold change attempts, and a short AI-written
  summary for a quick informational overview, without confirmation or correction. The AI only
  receives aggregated data without employee names. It is
  built from the 6:00 am data load and can be generated again on demand.
- **Monthly audit committee summary:** escalated cases and disputes, the branches and managers with
  the highest Pressure Index, dismissals for sales misconduct, complaints linked to employees,
  speak-up reports, and every threshold change whether approved or blocked. Each item links to its
  full case record and audit trail.

### Effectiveness metrics (compute in `lib/kri.js`, show on the dashboard and monthly summary)

| Metric | What it shows | Target |
| --- | --- | --- |
| Flags reviewed within deadline | Whether reviewers act on time | At least 95 percent |
| Average time to resolve a case | Whether cases are handled promptly | Within each level's deadline |
| False alarm rate | Share of flags overturned through disputes, overall and by branch | Falling over time |
| Bank-wide unused account rate | Whether misconduct is actually decreasing | Falling over time |
| Unapproved threshold changes | Whether detection was weakened without approval | Zero |

## Demo scenario (video must be ≤5 minutes)

The walkthrough is in `USER_GUIDE.md`, one account per role from the business up to the board:

1. Employee (Maya) reads why she was flagged, disputes and reports pressure anonymously.
2. Branch manager (Daniel) requests raising the High threshold from 70 to 85 → blocked, logged,
   internal audit alerted.
3. Conduct risk (Priya) reads the morning briefing's AI summary, sees Branch 12 High on the
   Pressure Index (about 80% of staff missing target) and sends the target for review.
4. Chief Risk Officer (Rosalind, optional) approves or rejects a proposal.
5. Internal audit (Samuel, optional) acknowledges the blocked-change alert and verifies the log.
6. Audit committee (Margaret) sees the case in the monthly summary with its full audit trail.

The seed data must make this scenario reproducible.

## Privacy and limitations (for the guide and `README.md`; the UI only shows the score notice to users)

- Scores are indicators, not proof; every flag has a named reviewer and a route to dispute and appeal.
- Data minimisation: only conduct-relevant data; employees can see all data held about them.
- Gaming risk (metrics, Pressure Index); the AI summary is informational and can be wrong.
  Human reviewers remain responsible for case decisions.

## Submission requirements (from project spec)

- Demonstrator must be hosted online with a working link.
- `G26_Demonstrator_Guide.pdf` (>2 pages): purpose, users, GRC problem and decisions supported,
  functions and workflow, tools/platform, access instructions, system requirements, demo accounts
  and test data, known limitations.
- `G26_Demonstrator_Demo.mp4` (≤5 min): access, main functions, use scenario,
  controls/approvals/escalation, outputs/alerts/reports, how it addresses the GRC problem.
- Zip as `G26_Technology_Demonstrator.zip`. Deadline: 13 Nov 2026, 23:59. Slides due 8 Nov 2026,
  23:59.

## Writing style for any report / guide text

- Concise, professional. Do not use colons or semicolons in drafted prose.
- No short forms/abbreviations in drafted prose except "CEO" and "AI".
