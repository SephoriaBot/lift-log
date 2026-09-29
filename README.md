# Liftlog

Workout tracker: Next.js 15, Clerk, Turso (Drizzle), Vercel.

## Setup
1. `npm install`
2. Create the DB: `turso db create liftlog`, then grab the URL and a token (see `.env.example`).
3. Create a Clerk app, copy the keys. Copy `.env.example` to `.env.local` and fill it in.
4. `npm run db:push` to create the tables, then `npm run dev`.
5. Push to GitHub, import the repo in Vercel, and add the same env vars there.

## How data is protected
Turso has no row-level security, so isolation lives in the server:
- `src/middleware.ts` requires a Clerk session on every route except `/`, `/sign-in`, `/sign-up`.
- The DB client is `server-only`; the browser never sees the Turso token.
- `src/lib/data.ts` is the only data access path. The user id comes from Clerk's `auth()`,
  never from form input, and every query filters on `user_id`. Writes that take IDs
  (workout, exercise, set) verify ownership first.
- **Rule:** never import `db` outside `src/lib/data.ts`.
