# Prototype Overview — Sales Conduct & Incentive Risk Monitoring Platform

Four layers of defence: an unauthorised account must get past every layer to go unnoticed.

| Layer | Purpose | Modules | Stops |
|---|---|---|---|
| 1 — Prevent | Stop the account being created | M1 Contact-Integrity Guard, M2 Independent Consent Gate | Opening without consent; fake emails; staff-set PINs |
| 2 — Remove the reward | Make misconduct pointless | M3 Usage-Linked Incentive Engine | Simulated funding; pressured approvals; accounts never used |
| 3 — Detect | Catch what gets through | M4 Conduct Analytics, M5 Speak-Up Channel | Branch-wide gaming; manager pressure; ignored complaints |
| 4 — Govern | Ensure action, prevent concealment | M6 Escalation and Case Management, M7 Tamper-Evident Control Governance | Pausing/narrowing monitoring; keeping the board uninformed |

**Output:** a Board Risk and Audit Committees conduct KRI dashboard — consent-decline rate,
unused-account rate, complaints, dismissals by reason, threshold changes, overdue alerts.

**Why it is now:** each feature exists somewhere in commercial GRC/RegTech products (conduct
surveillance platforms, incentive-compensation management systems, digital identity
verification), but none link consent, incentive credit and governed monitoring into one control
chain. That integration gap — not the individual technologies — is what this prototype
demonstrates, and it directly answers the "they don't have such design/control before?"
feedback on the proposal: the pieces existed at Wells Fargo in some form, but routed through the
same line-of-business chain with the conflict of interest that caused them to fail.

See the individual module docs for implementation detail: `M1_CONTACT_INTEGRITY_GUARD.md`
through `M7_TAMPER_EVIDENT_CONTROL_GOVERNANCE.md`, and `API.md` for the endpoint sketch the
frontend needs.
