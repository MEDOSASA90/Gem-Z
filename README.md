# GEM Z

GEM Z is a fitness ecosystem with a Next.js frontend, an Express/TypeScript API, PostgreSQL schemas, wallet/ledger modules, trainer/gym/store flows, AI features, social feed, chat, and PWA assets.

## Structure

- `frontend/` - Next.js app.
- `backend/` - Express API, Socket.IO, services, and feature modules.
- `database/` - PostgreSQL schema and incremental SQL migrations.
- `stitch-design/` - imported design references.
- `ai-system/` - planning/tasks for AI-assisted implementation.

## Required Environment

Backend requires these values in `backend/.env` or the deployment environment:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DB_NAME"
JWT_SECRET="long-random-secret"
REFRESH_SECRET="another-long-random-secret"
CLIENT_URL="http://localhost:3000"
API_URL="http://localhost:5000"
```

Optional integrations:

```env
OPENAI_API_KEY=""
SMTP_HOST=""
SMTP_PORT="587"
SMTP_USER=""
SMTP_PASS=""
FAWRY_SECURE_KEY=""
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
VAPID_SUBJECT="mailto:support@gem-z.com"
```

Production intentionally refuses to run without `DATABASE_URL`, `JWT_SECRET`, and `REFRESH_SECRET`.

## Local Checks

If `npm`/`npx` are healthy:

```bash
cd backend && npm run build
cd frontend && npm run build
```

If the global npm install is broken, use the local TypeScript binary directly:

```bash
cd backend && node node_modules/typescript/bin/tsc --noEmit
cd frontend && node node_modules/typescript/bin/tsc --noEmit
```

## Database

The migration runner executes:

1. `database/schema.sql`
2. `database/schema_v2_additions.sql`
3. `database/schema_v3_additions.sql`
4. `database/schema_v4_additions.sql`
5. `database/schema_v5_ecosystem.sql`
6. `database/schema_v6_wallet_system.sql`
7. `database/schema_v7_email_security.sql`
8. `database/schema_v8_user_kyc.sql`
9. `database/seed_pricing.sql`

Run migrations only against the intended database and keep real credentials out of Git.

## Current Notes

- `backend/dist/`, `frontend/out/`, temporary deploy folders, and zip artifacts are ignored for new files.
- Some existing generated/deploy artifacts are still present in history and should be removed in a cleanup commit.
- Arabic copy still needs a dedicated UTF-8/translation pass across older pages.
