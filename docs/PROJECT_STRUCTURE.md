# Project structure

## Frontend

```text
frontend/src
|- assets/             Images and other static assets
|- components/         Reusable UI components
|- contexts/           React contexts
|- pages/              Page components
|- services/           API calls and external services
|- styles/             Global Tailwind/CSS files
|- types/              Shared TypeScript types
`- utils/              Shared utility functions
```

## Backend

```text
backend
|- prisma/
|  |- migrations/      Versioned SQL migrations
|  |- models/          Prisma model files, grouped by domain
|  |- seeds/           Development seed scripts
|  `- schema.prisma    Prisma schema entry point
|- prisma.config.ts    Prisma datasource and migration configuration
`- src/
   |- config/          Environment and external service configuration
   |- modules/         Domain modules, added when the team defines them
   |- app.ts           Express middleware and route registration
   `- server.ts        Server startup
```

Prisma is the only location for database schema, migrations, and seed scripts. Do not place database SQL in `backend/src` or create a root-level `supabase/` folder.

Add each domain's Prisma models under `backend/prisma/models/`, such as `user.prisma` or `messaging.prisma`. Generated Prisma Client files belong in `backend/src/generated/` and are not committed.

The Supabase PostgreSQL connection string is read from `SUPABASE_DB_URL` in `backend/.env`. Never expose database credentials or Supabase service-role keys in frontend code.
