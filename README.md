# construction-location-backend

Node.js + TypeScript + Express backend for the construction employee live
location tracking system. PostgreSQL + PostGIS for storage, Socket.IO for
real-time distribution (wired up in a later phase), deployed to Render as a
single Docker web service. No Redis — this backend currently runs as exactly
one Node.js instance; see "Scaling" below.

## Requirements

- Node.js 22 LTS
- npm
- Docker (for local Postgres+PostGIS and for building the production image)

## Environment variables

Copy `.env.example` to `.env` and fill in real values before running locally.
See `.env.example` for the full list: `NODE_ENV`, `PORT`, `DATABASE_URL`,
`JWT_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGIN`, `LOCATION_UPDATE_INTERVAL`,
`LOCATION_DISTANCE_INTERVAL`, `LIVE_LOCATION_TIMEOUT`, `STALE_LOCATION_TIMEOUT`,
`OFFLINE_LOCATION_TIMEOUT`. Never commit a real `.env` file.

## Local development

```bash
npm install
cp .env.example .env
docker compose up -d db     # starts a local PostGIS-enabled Postgres on :5432
npm run db:migrate
npm run dev                 # starts the API on http://localhost:3000
curl http://localhost:3000/health
```

## PostgreSQL + PostGIS

Migrations are plain, hand-written SQL files in `migrations/`, applied in
filename order by a small custom runner (not drizzle-kit's generator) so we
have full control over `CREATE EXTENSION` statements and PostGIS geography
columns. Drizzle ORM is still used as the type-safe query builder for
application code (see `src/database/schema`).

- `npm run db:migrate` — applies all pending migrations.
- `npm run db:migrate:rollback` — rolls back the single most recently applied
  migration (requires a matching `<name>.down.sql` file, which every migration
  in this repo has).
- To add a new migration: create `NNNN_description.sql` and
  `NNNN_description.down.sql` in `migrations/`, following the existing
  numbering.

`postgis` and `pgcrypto` extensions are enabled by migration `0001`. Render's
managed Postgres supports enabling `postgis` via `CREATE EXTENSION`, so no
manual dashboard step is required.

## Docker

```bash
docker build -t construction-location-backend .
docker run -p 3000:3000 --env-file .env construction-location-backend
```

## Render deployment

`render.yaml` defines a Docker-based Web Service plus a managed Postgres
database. On first deploy:

1. Connect this repo to a new Render Blueprint (or create the Web Service and
   Postgres database manually using the same settings).
2. Set the `sync: false` secrets (`JWT_SECRET`, `JWT_REFRESH_SECRET`,
   `CORS_ORIGIN`) in the Render dashboard — they are intentionally not stored
   in `render.yaml`.
3. Render provides `DATABASE_URL` and `PORT` automatically; the app reads both
   from the environment and binds to `0.0.0.0`.
4. Run `npm run db:migrate` against the Render database (e.g. via a Render
   Shell session or a one-off job) after the first deploy, and after any
   deploy that adds new migration files.

## Health check

`GET /health` returns `200 {"status":"ok"}`, requires no authentication, and
is configured as Render's health check path.

## WebSocket / Socket.IO

Socket.IO is installed as a dependency but not yet wired up (real-time
location broadcast is a later phase). It will run inside this same Node.js
process and Render Web Service — no separate WebSocket server.

## Scaling limitation (no Redis)

This backend currently runs as a single Node.js instance, so in-memory
Socket.IO connection state is safe. If this ever needs to scale to multiple
instances, a shared Socket.IO adapter (e.g. Redis) will be required at that
time — it is intentionally not part of this initial architecture.

## Backups

Location history is the most important data to protect. Render's paid
Postgres plans include automated daily backups with point-in-time recovery;
on the free plan, schedule an external `pg_dump` (e.g. via a cron job or
Render Cron Job) with a retention window of at least a few days. Detailed
retention/restore steps will be written up once the database is live.

## Troubleshooting

- **Server won't start / "Invalid environment configuration" error**: a
  required env var is missing — check the error message, which lists exactly
  which key(s) failed validation.
- **`db:migrate` can't connect**: confirm `DATABASE_URL` is correct and, for
  local development, that `docker compose up -d db` is running.
- **CORS errors from the mobile app**: confirm `CORS_ORIGIN` matches the
  origin the request is actually coming from; wildcards are intentionally not
  supported.
