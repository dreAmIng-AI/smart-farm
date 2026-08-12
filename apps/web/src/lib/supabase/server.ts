import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

function readSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return { anonKey, url };
}

export async function createServerSupabaseClient() {
  const { anonKey, url } = readSupabaseConfiguration();
  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(values) {
        try {
          values.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Server Components cannot persist refreshed Supabase session cookies.
        }
      },
    },
  });
}
