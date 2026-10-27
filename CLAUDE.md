# Project context for AI coding assistants

This is the technology-enabled prototype for NUS IS4234 Group 26's report on the Wells Fargo
cross-selling scandal (GRC case study). See `docs/PROTOTYPE_OVERVIEW.md` for the four-layer
control design and implementation status, and `docs/M1..M7` for per-module specs.

## Stack and layout

Single Next.js 15 app (App Router, JavaScript — not TypeScript), Tailwind CSS, Prisma ORM
against Postgres, deployed on Vercel. No separate `backend/`/`frontend/` split — pages, API
routes and data access all live in one project:

- `app/` — pages (`page.js`) and API route handlers (`app/api/**/route.js`)
- `lib/` — `prisma.js` (singleton client), `kri.js` (Board KRI aggregation)
- `prisma/` — `schema.prisma`, `seed.js`

## Build scope

Deep (fully interactive) on M1 Contact-Integrity Guard, M2 Independent Consent Gate, M4 Conduct
Analytics, M6 Escalation & Case Management, and the Board KRI dashboard. Light (seeded/logged
demo data only, feeding the same alert/case/dashboard views) on M3 Usage-Linked Incentive
Engine, M5 Speak-Up Channel, M7 Tamper-Evident Control Governance. M1 and M2 pages pair the
banker's screen with a simulated customer phone (`components/CustomerPhone.js`, state in
`components/usePhoneSimulator.js`); the customer's side must stay visually separate from staff
controls — never put a customer action on the banker's panel. When touching a module, read
its doc in `docs/` first — it states which depth it was built at and which files implement it.

## Conventions

- No TypeScript — keep new files `.js`/`.jsx`, not `.ts`/`.tsx`.
- Mock/synthetic, committed seed data only (`prisma/seed.js`) — no live external data sync, so
  demo/grading runs are reproducible. Any new seed data should go there, not hard-coded into
  pages.
- No auth layer by design (scoped course prototype) — don't add one unless asked.
- Every Prisma write that changes a `Case`'s status or level should append a `CaseEvent` — that
  table is the audit trail the UI renders, and the whole point of M6 is that every action is
  time-stamped with evidence.
- `lib/kri.js` is the single source of truth for Board dashboard numbers — compute new KRIs
  there, not inline in `app/board/page.js`.
