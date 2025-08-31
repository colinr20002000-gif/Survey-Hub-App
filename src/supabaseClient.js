// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// --- DEBUGGING CHECK ---
// This will confirm that your .env file is being loaded.
if (!supabaseUrl || !supabaseAnonKey) {
  // If you see this alert, it means you need to restart your server.
  alert("Supabase environment variables are not loaded! Please check your .env file and RESTART your development server (npm run dev).")
}
// --------------------

export const supabase = createClient(supabaseUrl, supabaseAnonKey)