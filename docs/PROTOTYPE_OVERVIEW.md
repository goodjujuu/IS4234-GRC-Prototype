# Prototype Overview — Sales Conduct & Incentive Risk Monitoring Platform

Four layers of defence: an unauthorised account must get past every layer to go unnoticed.

| Layer | Purpose | Modules | Stops |
|---|---|---|---|
| 1 — Prevent | Stop the account being created | M1 Contact-Integrity Guard, M2 Independent Consent Gate | Opening without consent; fake emails; staff-set PINs |
| 2 — Remove the reward | Make misconduct pointless | M3 Usage-Linked Incentive Engine | Simulated funding; pressured approvals; accounts never used |
| 3 — Detect | Catch what gets through | M4 Conduct Analytics, M5 Speak-Up Channel | Branch-wide gaming; manager pressure; ignored complaints |
| 4 — Govern | Ensure action, prevent concealment | M6 Escalation and Case Management, M7 Tamper-Evident Control Governance | Pausing/narrowing monitoring; keeping the board uninformed |

**Output:** a Board Risk and Audit Committees conduct KRI dashboard — consent-decline rate,
unused-account rate, complaints, open alerts, overdue/resolved cases, threshold changes.

**Why it is now:** each feature exists somewhere in commercial GRC/RegTech products (conduct
surveillance platforms, incentive-compensation management systems, digital identity
verification), but none link consent, incentive credit and governed monitoring into one control
chain. That integration gap — not the individual technologies — is what this prototype
demonstrates, and it directly answers the "they don't have such design/control before?"
feedback on the proposal: the pieces existed at Wells Fargo in some form, but routed through the
same line-of-business chain with the conflict of interest that caused them to fail.

## Implementation status

Built as a single Next.js app (JavaScript, App Router, Tailwind, Prisma + Postgres) rather than
the earlier two-service scaffold — see the repo root `README.md` for why. All seven modules
are fully interactive. Customer- and employee-facing steps happen on a simulated phone, kept
visually separate from the staff systems, so each control's independence is visible on screen:

| Module | Depth | Where |
|---|---|---|
| M1 Contact-Integrity Guard | **Deep** | `app/customers/`, `lib/contactRules.js`, `app/api/accounts/[id]/contact-change`, `app/api/contact-changes/[id]`, `app/api/accounts/[id]/pin` |
| M2 Independent Consent Gate | **Deep** | `app/accounts/new/`, `app/api/accounts/**`, `components/CustomerPhone.js` |
| M3 Usage-Linked Incentive Engine | **Deep** | `app/incentives/`, `lib/incentives.js`, `components/BankingAppScreen.js`, `app/api/incentives/**`, `app/api/accounts/[id]/transactions` |
| M4 Conduct Analytics | **Deep** | `app/alerts/` (risk map + alert queue), `lib/analytics.js`, `lib/thresholds.js`, `app/api/analytics/**`, `app/api/alerts/**` |
| M5 Speak-Up Channel | **Deep** | `app/speak-up/`, `components/SpeakUpAppScreen.js`, `app/api/reports/**` |
| M6 Escalation and Case Management | **Deep** | `app/cases/` (tier board, SLA sweep), `app/cases/[id]`, `app/api/cases/**` |
| M7 Tamper-Evident Control Governance | **Deep** | `app/governance/`, `lib/governance.js`, `lib/hashChain.js`, `app/api/governance/**` |
| Board KRI dashboard | **Deep** | `app/board/`, `lib/kri.js`, `app/api/kri/` |

Every module's data flows into the same Prisma tables and the same live Board
dashboard calculation (`lib/kri.js`), so the KRI numbers always reflect real rows, not hard-coded
demo text.

See the individual module docs for implementation detail: `M1_CONTACT_INTEGRITY_GUARD.md`
through `M7_TAMPER_EVIDENT_CONTROL_GOVERNANCE.md`, `API.md` for the actual route list, and
`DEPLOYMENT.md` for how to run/host it.
