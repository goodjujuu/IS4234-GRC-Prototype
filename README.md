# ConductGuard

NUS IS4234 (Governance, Regulation and Compliance Technology), Sem 1 AY2026/2027, Group 26
(Garet Ang, Javier Yeow, Manimaran Pramoth, Reina Tng Xin Ru).

An observability platform for conduct risk in retail banking, built as the technology demonstrator
for the group's case study of the Wells Fargo cross-selling scandal. ConductGuard targets the sales
pressure created by managers and targets, not only the behaviour of employees.

1. **Conduct Surveillance** monitors three levels. Employee Conduct scores seven peer-relative
   metrics from 0 to 100. Managers and Targets combines seven measures into a Pressure Index and
   links it to employee flags. Threshold Governance protects the detection thresholds.
2. **Alerting and Case Management** opens a case with a named reviewer and a deadline, escalates
   overdue or repeated cases, handles disputes and appeals, and records every action.
3. **Risk Reporting** provides a live dashboard, a daily morning briefing and a monthly audit
   committee summary.

`solution.md` is the source of truth for the design, and `CLAUDE.md` summarises it for building.

## Setup

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL and SESSION_SECRET
npx prisma migrate deploy
npm run seed
npm run dev
```

Open http://localhost:3000. Hosting steps are in `docs/DEPLOYMENT.md`.

## Demo accounts

Every account uses the password `demo1234`. The login page also has one-click buttons.

| Role | Name | Email |
| --- | --- | --- |
| Employee (High risk) | Maya Lindqvist | `maya.lindqvist@conductguard.demo` |
| Team lead, Branch 12 | Daniel Okafor | `daniel.okafor@conductguard.demo` |
| Conduct risk analyst | Priya Raman | `priya.raman@conductguard.demo` |
| Chief Risk Officer | Rosalind Keane | `rosalind.keane@conductguard.demo` |
| Internal auditor | Samuel Ito | `samuel.ito@conductguard.demo` |
| Audit committee chair | Margaret Flynn | `margaret.flynn@conductguard.demo` |

## Demo scenario

The step-by-step walkthrough is in [`USER_GUIDE.md`](USER_GUIDE.md). It follows one problem from the
branch up to the board: Maya (employee), Daniel (team lead), Priya (conduct risk), Rosalind (Chief
Risk Officer, optional), Samuel (internal audit, optional) and Margaret (audit committee).

`npm run seed` restores the exact starting state.

## Architecture notes

- One Next.js 15 project (App Router, JavaScript), Tailwind CSS, Prisma and Postgres, hosted on
  Vercel. API routes hold the server-side rules.
- `lib/scoring.js`, `lib/pressure.js`, `lib/engine.js`, `lib/hashChain.js` and `lib/briefing.js` are
  CommonJS so `prisma/seed.js` runs the same engine as the app and cannot drift from it.
- `lib/kri.js` is the single source of truth for dashboard and effectiveness numbers.
- Seed data is synthetic and deterministic, using a fixed random seed and a demo clock starting
  Monday 9 November 2026, 8:30 am. Actions tick the clock forward, so deadlines and windows give the same results on every run.
- The AI draft calls Claude when `ANTHROPIC_API_KEY` is set, sending only aggregate facts and no
  employee names. Without a key it uses a template, and the page labels it as simulated.

## Known limitations

- Demo logins share a password, and sessions are simple signed cookies. Not a production access model.
- Scores are indicators, not proof. Metrics and the Pressure Index can be gamed.
- An AI summary can be wrong, so it stays unconfirmed until a reviewer confirms or corrects it.
- The hash chain lives in the same database it protects. A production build would anchor it in a
  write-once store. Editing and deleting are detected, not prevented.
- A speak-up seal could be tested by someone holding both the secret and the employee list. A
  production build would need independent key custody.
- Scoring and deadline sweeps run at seed time rather than on a scheduler, and the morning
  briefing is an on-screen summary page rather than a scheduled email.

## Acknowledging AI use

Per course requirements, AI tool usage for this project is logged in the group report's
"Acknowledging Your Use of AI" table, not in this repo.
