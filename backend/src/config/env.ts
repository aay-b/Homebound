import 'dotenv/config'

// Stop startup early when a required secret or connection value is missing.
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
  databaseUrl: required('SUPABASE_DB_URL'),
}

// Allow every localhost port so multiple local Vite clients can join a demo.
export function isAllowedClientOrigin(origin?: string) {
  return !origin || origin === env.clientOrigin || /^http:\/\/localhost:\d+$/.test(origin)
}

export function getSupabaseEnv() {
  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
