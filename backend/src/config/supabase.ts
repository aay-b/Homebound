import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/config/env.js'

const { supabaseUrl, supabaseSecretKey, supabasePublishableKey } = getSupabaseEnv()

// This server-only client must never be imported by frontend code.
export const supabase = createClient(supabaseUrl, supabaseSecretKey)
export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey)
