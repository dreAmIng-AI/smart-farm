import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;

function readSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { anonKey, url };
}

export function createBrowserSupabaseClient() {
  if (!browserClient) {
    const { anonKey, url } = readSupabaseConfiguration();
    browserClient = createBrowserClient(url, anonKey);
  }

  return browserClient;
}
