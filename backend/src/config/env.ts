import 'dotenv/config'

// Stop startup early when a required secret or connection value is missing.
function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  // Vite may use 5174 when another frontend instance already uses 5173.
  clientOrigins: [process.env.CLIENT_ORIGIN ?? 'http://localhost:5173', 'http://localhost:5174'],
  databaseUrl: required('SUPABASE_DB_URL'),
}

export function getSupabaseEnv() {
  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  }
}
