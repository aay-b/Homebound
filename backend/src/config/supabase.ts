import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/config/env.js'

const { supabaseUrl, supabaseServiceRoleKey } = getSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)
