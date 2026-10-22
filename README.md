# Sales Conduct & Incentive Risk Monitoring Platform

NUS IS4234 (Governance, Regulation and Compliance Technology), Sem 1 AY2026/2027 — Group 26.

## Overview

A technology-enabled prototype for the group's GRC case study: the Wells Fargo cross-selling
scandal. It asks a narrower, buildable version of the report's research question — *can
account-opening consent, incentive payout and escalation be linked into one control chain, so
that an unauthorised account can't go undetected the way it did at Wells Fargo for over a
decade?*

## Background

Between 2002 and 2016, Wells Fargo employees opened millions of unauthorised accounts to meet
sales quotas. The bank had a code of ethics, a whistleblower hotline, sales-quality monitoring
and internal audit — but no control verified customer consent at account opening, and
complaint/hotline/HR data was never linked to account-behaviour data, so no one saw the full
pattern until it became national news. Full case analysis is in the group's IS4234 report
(Section 2–3); this repo implements only the Section 4 prototype.

## What the app does

Four layers of defence, each with its own control module — see `docs/PROTOTYPE_OVERVIEW.md` for
the full design and `docs/M1..M7` for per-module specs:

1. **Prevent** — block the account from being created without independent customer consent
   (M1 Contact-Integrity Guard, M2 Independent Consent Gate)
2. **Remove the reward** — hold sales credit as provisional until the account is genuinely used
   (M3 Usage-Linked Incentive Engine)
3. **Detect** — flag anomalous patterns and route whistleblower reports around the
   line-of-business chain (M4 Conduct Analytics, M5 Speak-Up Channel)
4. **Govern** — escalate on a tiered deadline and make the monitoring system itself
   tamper-evident (M6 Escalation and Case Management, M7 Tamper-Evident Control Governance)

Output: a Board Risk and Audit Committees conduct KRI dashboard (consent-decline rate,
unused-account rate, complaints, dismissals by reason, threshold changes, overdue alerts).

## Tech stack

Not yet chosen — pick whatever the team can realistically build and demo within the course
timeline. `backend/` and `frontend/` are placeholders; see each folder's README.

## Setup

Not yet runnable — this is a structure-only scaffold. Once a stack is chosen:

1. Fill in `backend/` and `frontend/` with real app code
2. Wire up `Makefile` targets (`install`, `dev`, `build`) and `start.sh` / `start.ps1` for your
   chosen stack
3. Copy `.env.example` to `.env` and fill in any required values
4. `make install && make dev` (macOS/Linux) or `./start.ps1 -Install` (Windows) — once those
   scripts actually do something

## Architecture notes

- Flat two-service layout (`backend/`, `frontend/`) rather than a monorepo — this is a scoped
  course prototype, not a production system, so the simpler layout matches the project's size.
- `deploy/` holds whatever hosting setup the team picks (the course requires a working, hosted,
  accessible link for the technology demonstrator submission).
- Mock/synthetic data is acceptable and expected for the demo — see each module doc's "Data
  inputs" section.

## Status

Scaffold only. See `docs/` for the module specs — each is templated against the course's
prototype-documentation rubric (intended users, problem, data inputs, workflow/logic,
outputs/alerts/escalation, ownership, evaluation, feasibility) so they can be lifted straight
into the report's Technology-enabled prototype section once filled in.

## Known limitations (fill in as the prototype develops)

- TODO — needed for `GroupID_Demonstrator_Guide.pdf`

## Acknowledging AI use

Per course requirements, AI tool usage for this project is logged in the group report's
"Acknowledging Your Use of AI" table, not in this repo.
