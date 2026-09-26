import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/config/env.js'

const { supabaseUrl, supabaseSecretKey } = getSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseSecretKey)
