import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seeds/messaging.seed.ts',
  },
  datasource: {
    url: env('SUPABASE_DB_URL'),
  },
})
