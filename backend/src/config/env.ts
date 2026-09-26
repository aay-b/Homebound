import 'dotenv/config'

function required(name: string): string {
  const value = process.env[name]
  if (!value) throw new Error(`Missing environment variable: ${name}`)
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 3000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173',
}

export function getSupabaseEnv() {
  return {
    supabaseUrl: required('SUPABASE_URL'),
    supabaseSecretKey: required('SUPABASE_SECRET_KEY'),
    supabasePublishableKey: required('SUPABASE_PUBLISHABLE_KEY'),
  }
}
