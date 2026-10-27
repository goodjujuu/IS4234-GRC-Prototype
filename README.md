# Sales Conduct & Incentive Risk Monitoring Platform

NUS IS4234 (Governance, Regulation and Compliance Technology), Sem 1 AY2026/2027 — Group 26
(Garet Ang, Javier Yeow, Manimaran Pramoth, Reina Tng Xin Ru).

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
the full design and `docs/M1..M7` for per-module specs and implementation status:

1. **Prevent** — block the account from being created without independent customer consent
   (M1 Contact-Integrity Guard, M2 Independent Consent Gate)
2. **Remove the reward** — hold sales credit as provisional until the account is genuinely used
   (M3 Usage-Linked Incentive Engine)
3. **Detect** — flag anomalous patterns and route whistleblower reports around the
   line-of-business chain (M4 Conduct Analytics, M5 Speak-Up Channel)
4. **Govern** — escalate on a tiered deadline and make the monitoring system itself
   tamper-evident (M6 Escalation and Case Management, M7 Tamper-Evident Control Governance)

Output: a Board Risk and Audit Committees conduct KRI dashboard (consent-decline rate,
unused-account rate, complaints, open alerts, overdue/resolved cases, threshold changes).

All seven modules and the Board dashboard are fully interactive. Customer and employee steps
(consent replies, contact-change objections, PIN setup, using a new account, speak-up reports)
happen on a simulated phone beside the staff system, so each control's independence is visible
on screen. Presenter-only controls (clearly marked) fast-forward time for the 90-day review,
SLA deadlines and cooling-off periods. See
`docs/PROTOTYPE_OVERVIEW.md#implementation-status` for the breakdown and file pointers.

## Tech stack

Single Next.js app (App Router, JavaScript, no TypeScript) — chosen over a separate
backend/frontend split to minimise moving parts for a course-timeline build:

- **Next.js 15** (App Router) — pages and API routes in one project
- **Tailwind CSS** — styling
- **Prisma ORM** + **Postgres** (free tier via Neon or Vercel Postgres) — data layer
- **Vercel** — hosting (the course requires a working, hosted, accessible link)

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL — see docs/DEPLOYMENT.md
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open http://localhost:3000 — the home page lays out a demo path through all four layers. Full
hosting steps (Neon + Vercel) are in `docs/DEPLOYMENT.md`.

## Architecture notes

- One Next.js project at repo root — no `backend/`/`frontend/` split, no Docker, no Makefile.
  Earlier scaffolding iterations used a flatter two-service layout (inspired by the group's
  other NUS project, `is4228`); this was simplified further once the stack was chosen, since a
  single Next.js app already keeps pages, API routes and data access co-located.
- Mock/synthetic, committed seed data (`prisma/seed.js`) rather than any live external sync —
  same reproducibility rationale as `is4228`: a demo or grading run should always show the same
  thing. Re-running `npm run seed` resets to a known state.
- No auth layer. Every page and API route is open — acceptable for a scoped course prototype
  demonstrating a control *design*, not a production access-control model.

## Status

Built. See `docs/` for the module specs — each is templated against the course's
prototype-documentation rubric (intended users, problem, data inputs, workflow/logic,
outputs/alerts/escalation, ownership, evaluation) plus an implementation-status note, so they
can be lifted straight into the report's Technology-enabled prototype section.

## Known limitations

- No authentication/authorization — anyone with the URL can act as any role.
- M7's hash chain is real SHA-256 but lives in the same database it protects; a production
  build would anchor it externally (e.g. a write-once store) so a database admin could not
  rewrite the whole chain.
- Time-based rules (90-day usage review, SLA deadlines, cooling-off) run on demand from presenter
  controls rather than on a scheduler — a production build would run them as scheduled jobs.
- Customer and employee phones are simulations; no real SMS or banking app is involved.

## Acknowledging AI use

Per course requirements, AI tool usage for this project is logged in the group report's
"Acknowledging Your Use of AI" table, not in this repo.
