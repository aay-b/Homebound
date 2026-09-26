import { createClient } from '@supabase/supabase-js'
import { getSupabaseEnv } from '@/config/env.js'

const { supabaseUrl, supabaseSecretKey, supabasePublishableKey, } = getSupabaseEnv()

export const supabase = createClient(supabaseUrl, supabaseSecretKey)

export const supabaseAuth = createClient(supabaseUrl, supabasePublishableKey,)
