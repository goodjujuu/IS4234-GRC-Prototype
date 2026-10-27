# M7 — Tamper-Evident Control Governance

**Layer:** 4 — Govern

**Implementation status:** DEEP — fully interactive at `/governance`.

**Problem it addresses:** At Wells Fargo the business could pause or narrow its own sales
monitoring, and the board learned of the 5,300 dismissals only once they became public.

**Intended users / decisions supported:** Anyone can propose a threshold change; only the
Second-Line Risk Officer or CRO can sign it off; the Board sees integrity and coverage.

**Data inputs:** `Threshold`, `ThresholdChangeRequest`, `ConfigChangeLog`, `AnalyticsRun`,
alert history.

**Workflow / rules / analytical logic** (enforced server-side):
- **Maker-checker:** a change is only a request until signed off; the requester can never
  approve their own request; business-line roles can never approve
- **Suppression check:** each request records how many current M4 breaches it would hide; hiding
  any requires a written justification to approve
- **Switch-off guard:** a value that can never trigger needs the CRO
- **Hash-chained log** (`lib/hashChain.js`): SHA-256 over each entry plus the previous hash.
  Approvals and rejections are both logged. "Verify" recomputes the chain; a broken chain raises a
  HIGH `LOG_TAMPERING_DETECTED` alert, which M6 routes straight to the CRO. A presenter control
  simulates someone editing a past entry directly in the database.
- **Coverage report:** checks switched on, branches scanned by a recent analytics run
- **Suppression monitor:** weekly alert volume; a drop below half the 4-week average is flagged

**Outputs / alerts / escalation:** threshold changes, chain integrity and suppression status →
Board KRI pack.

**Ownership:** TODO · **Effectiveness:** TODO (can a simulated attempt to narrow monitoring be
detected and reported within a defined window?)

**Files:** `app/governance/page.js`, `lib/governance.js`, `lib/hashChain.js`,
`app/api/governance/**`, `prisma/schema.prisma` (`Threshold`, `ThresholdChangeRequest`,
`ConfigChangeLog.prevHash`, `AnalyticsRun`).
