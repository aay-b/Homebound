# Project structure

## Frontend

```text
frontend/src
├── assets/             Images and other static assets
├── components/         Reusable UI components
├── contexts/           React contexts
├── pages/              Page components
├── services/           API calls and external services
├── styles/             Global Tailwind/CSS files
├── types/              Shared TypeScript types
└── utils/              Shared utility functions
```


## Backend

```text
backend/src
├── config/             Environment and Supabase configuration
└── modules/            Domain modules, added when the team defines them
└── app.ts              Express middleware and route registration
```

Do not create module names or layers until the team has agreed on the domain boundary and API design.

## Supabase

```text
supabase/
├── migrations/         Versioned SQL schema changes
├── seeds/              Development seed SQL
└── functions/          Optional Supabase Edge Functions
```

Never place SQL migrations in `backend/src`. Supabase credentials are read from `backend/.env`; the service-role key must never appear in frontend code.
