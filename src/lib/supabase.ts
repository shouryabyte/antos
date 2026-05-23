export const supabaseConfig = {
  url: import.meta.env.VITE_SUPABASE_URL || "",
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || ""
};

// Production integration point:
// import { createClient } from "@supabase/supabase-js";
// export const supabase = createClient(supabaseConfig.url, supabaseConfig.anonKey);
export const supabase = null;
