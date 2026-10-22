# Deployment — Neon Postgres + Vercel

The course requires a working, hosted, accessible link for the Technology Demonstrator
submission. This app is a single Next.js project, so hosting is one Vercel project with one
environment variable.

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
# paste your Neon connection string into .env as DATABASE_URL
npx prisma migrate dev --name init
npm run seed
npm run dev
```

Open http://localhost:3000 and walk through the demo path on the home page. `npx prisma studio`
is useful for inspecting the seeded data directly.

## 3. Push to GitHub

```bash
git add -A
git commit -m "Build all-Next.js prototype (M2/M4/M6 + Board dashboard deep, M1/M3/M5/M7 seeded)"
git push origin main
```

(If this is the first push since the repo was created, use `git push -u origin main` instead.)

## 4. Import into Vercel

1. Go to https://vercel.com, sign in with GitHub, and "Add New… → Project".
2. Select the `IS4234-GRC-Prototype` repo.
3. Framework preset should auto-detect **Next.js** — leave the build command as `next build`.
4. Under **Environment Variables**, add `DATABASE_URL` with the same Neon connection string.
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

## 6. Verify

Open the Vercel-assigned URL (e.g. `https://is4234-grc-prototype.vercel.app`) and confirm the
demo path on the home page works end to end: open an account → decline/expire or approve
consent → check `/alerts` → escalate → walk the case through `/cases/[id]` → check `/board`.

That hosted URL is what goes in the Technology Demonstrator submission, alongside the 2+ page
guide PDF and the 5-minute demo video.

## Notes on reproducibility

Following the `is4228` reference project's convention: this app has no live external data sync
— everything shown is committed, seeded, synthetic data (`prisma/seed.js`), re-run with
`npm run seed` whenever you want a clean demo state. Re-seeding is destructive (it clears and
re-inserts all rows) — don't run it against a database with real demo progress you want to keep
mid-presentation.
