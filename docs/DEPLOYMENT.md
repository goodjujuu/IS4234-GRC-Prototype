# Deployment — Neon Postgres + Vercel

The course requires a working, hosted, accessible link for the Technology Demonstrator
submission. This app is a single Next.js project, so hosting is one Vercel project with a few
environment variables.

## 1. Create a free Postgres database (Neon)

1. Go to https://neon.tech and sign up / log in (a GitHub login is fine).
2. Create a new project (any name, e.g. `is4234-grc-prototype`).
3. Copy the connection string it gives you — it looks like:
   `postgresql://<user>:<password>@<host>/<dbname>?sslmode=require`
4. (Vercel Postgres, now "Vercel Storage → Postgres", works the same way if you'd rather create
   the database directly from the Vercel dashboard instead — skip to step 3 of the Vercel
   section below and add storage from there.)

## 2. Run locally first

In the project folder, in your own terminal:

```bash
npm install
cp .env.example .env
# paste your Neon connection string into .env as DATABASE_URL, and set SESSION_SECRET
npx prisma migrate deploy
npm run seed
npm run dev
```

Open http://localhost:3000, choose a demo account and follow the demo scenario in
`README.md`. `npx prisma studio` is useful for inspecting the seeded data directly.

## 3. Push to GitHub

```bash
git add -A
git commit -m "Rebuild as ConductGuard"
git push origin main
```

(If this is the first push since the repo was created, use `git push -u origin main` instead.)

## 4. Import into Vercel

1. Go to https://vercel.com, sign in with GitHub, and "Add New… → Project".
2. Select the `IS4234-GRC-Prototype` repo.
3. Framework preset should auto-detect **Next.js** — leave the build command as `next build`.
4. Under **Environment Variables**, add:
   - `DATABASE_URL`, the same Neon connection string.
   - `SESSION_SECRET`, the same long random string as your local `.env`. It signs logins and
     speak-up seals, so the seed must run with the same value or the retaliation guard will not
     recognise the seeded reporter.
   - `GEMINI_API_KEY` (optional). Enables a live AI summary on "Generate again". Create the key in
     [Google AI Studio](https://aistudio.google.com/apikey). Without it, the briefing uses a labelled
     template summary. Set `GEMINI_MODEL` to override the default `gemini-3.6-flash` model.
5. Deploy.

## 5. Set up the production database

The production database is empty until you migrate and seed it. From your own terminal, with
your `.env` still pointing at the *same* Neon connection string used in Vercel (Neon only has
one database per project unless you create branches, so this is usually already true):

```bash
npx prisma migrate deploy
npm run seed
```

If you created a separate production database, run the same two commands with `DATABASE_URL`
temporarily set to that database's connection string instead.

If this database already held the earlier seven-module prototype, `migrate deploy` drops those
tables and replaces them. They only ever held synthetic demo data.

## Updating an existing ConductGuard database

Apply committed migrations and regenerate the local Prisma Client without reseeding.

```bash
npx prisma migrate deploy
npx prisma generate
```

The `20261113090000_remove_legacy_threshold_workflows` migration drops the unused proposal
and configuration-log tables, deletes obsolete threshold-change and log-tampering alerts
and their matching notifications, and removes `thresholdAttempts` from saved briefing facts.
It preserves cases, case events, disputes, appeals, speak-up reports, scoring settings and
briefing text and review decisions. Existing migrations remain unchanged. Do not run
`npm run seed` when preserving demo progress.

The `20261113100000_remove_cro_role` migration retires Chief Risk Officer accounts and their
notifications. Any cases at that tier move to the audit committee with an appended case
event, while preserving their status, deadlines, outcomes and evidence. Committee reviewers
receive notifications for reassigned open cases. The application now has five roles.

## 6. Verify

Open the Vercel-assigned URL (e.g. `https://is4234-grc-prototype.vercel.app`) and confirm the
five-step demo scenario in `README.md` works end to end: morning briefing → Pressure Index →
employee dispute and speak-up → manager and target review → audit committee summary.

That hosted URL is what goes in the Technology Demonstrator submission, alongside the 2+ page
guide PDF and the 5-minute demo video.

## Notes on reproducibility

Following the `is4228` reference project's convention: this app has no live external data sync
— everything shown is committed, seeded, synthetic data (`prisma/seed.js`), re-run with
`npm run seed` whenever you want a clean demo state. Re-seeding is destructive (it clears and
re-inserts all rows) — don't run it against a database with real demo progress you want to keep
mid-presentation. It also resets the demo clock to Monday 9 November 2026, 8:30 am, so re-seed
before recording or grading.

## Live AI briefing

Set `GEMINI_API_KEY` in your local `.env` and in the Vercel server environment. Restart
`npm run dev` after changing local settings, or redeploy after changing hosted settings.
Sign in as Priya, open **Morning Briefing** and select **Generate again**. A successful
request shows **AI summary**, ready to read without confirmation or correction.
Seeded briefings use a template until you generate a new one.

The server calls Google's Gemini `generateContent` API with aggregate figures only.
It uses a 45-second timeout and falls back to a template on missing credentials, quota
limits, blocked or incomplete responses, and connection failures. The reason is saved
with the briefing and displayed on the page. Check project quota and model access in
Google AI Studio if generation fails. Keys stay on the server and must not use a
`NEXT_PUBLIC_` prefix. Existing Anthropic keys are no longer used.
