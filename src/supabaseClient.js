// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_KEY

// This is now a hard failure check. If the app loads at all, the keys were found.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("CRITICAL: Supabase URL or Anon Key is missing. Check your .env file (local) or Vercel Environment Variables (production) and restart/redeploy.")
}

// Regular client for normal operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Admin client for user management (requires service role key)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null

