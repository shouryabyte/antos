# Deployment And Environment Flow

AntOS has two operating modes:

- Supabase mode: production-like mode using Supabase Auth and Supabase PostgreSQL.
- Demo fallback mode: local review mode used only when frontend Supabase env variables are missing.

## Local Development

```mermaid
flowchart TD
  A[Developer Machine] --> B[npm install]
  B --> C[npm run dev]
  C --> D[React/Vite App]
  D --> E[VITE_SUPABASE_URL]
  D --> F[VITE_SUPABASE_ANON_KEY]
  E --> G[Supabase Auth]
  F --> H[Supabase PostgreSQL]
  G --> I[Authenticated Session]
  H --> J[RLS-Protected Tables]
```

## Supabase Setup

1. Create a Supabase project.
2. Run `supabase/schema.sql` in the Supabase SQL Editor.
3. Add frontend env variables to `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

4. Add seed-only env variables to `.env.seed`:

```env
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

5. Run `npm run seed:supabase`.

## Seed Flow

```mermaid
flowchart TD
  A[.env.seed] --> B[scripts/seed-supabase.mjs]
  B --> C[SUPABASE_SERVICE_ROLE_KEY]
  C --> D[Supabase Auth Admin API]
  C --> E[Supabase PostgreSQL]
  D --> F[Seed Auth Users]
  E --> G[Seed Roles / Permissions / Profiles]
  E --> H[Seed Core Sample Rows]
```

The service role key is required only for administrative seeding. It must not be used in frontend code or `VITE_` variables.

## Vercel Deployment Flow

```mermaid
flowchart TD
  A[GitHub Repository] --> B[Vercel Project]
  B --> C[Vite Build]
  C --> D[Static SPA Assets]
  B --> E[Environment Variables]
  E --> F[VITE_SUPABASE_URL]
  E --> G[VITE_SUPABASE_ANON_KEY]
  D --> H[Deployed AntOS App]
  H --> I[Supabase Auth]
  H --> J[Supabase PostgreSQL + RLS]
```

## Required Frontend Variables

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Seed/Admin Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

## Safety Rules

- Do not expose `SUPABASE_SERVICE_ROLE_KEY` in frontend env variables.
- Do not commit `.env.local` or `.env.seed`.
- Use the anon key in frontend only.
- Use the service role key only from `.env.seed` or secure CI secret storage.
- Configure hosting SPA fallback so refreshed routes load `index.html`.
