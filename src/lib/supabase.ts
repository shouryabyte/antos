export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
};

export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

// AntOS currently runs in demo mode using localStorage so reviewers can open the
// app without provisioning a backend. When moving to production:
// 1. Install @supabase/supabase-js.
// 2. Replace this null export with createClient(supabaseConfig.url, supabaseConfig.anonKey).
// 3. Move store actions into repository/query functions backed by Supabase.
// 4. Enable RLS using the policy plan documented in supabase/schema.sql.
// import { createClient } from "@supabase/supabase-js";
// export const supabase = isSupabaseConfigured ? createClient(supabaseConfig.url, supabaseConfig.anonKey) : null;
export const supabase = null;
