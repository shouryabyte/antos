import { createClient } from "@supabase/supabase-js";

export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
};

export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseConfig.url, supabaseConfig.anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true
      }
    })
  : null;
