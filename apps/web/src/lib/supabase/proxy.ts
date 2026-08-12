import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

function readSupabaseConfiguration() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  return url && anonKey ? { anonKey, url } : null;
}

export async function updateSupabaseSession(request: NextRequest) {
  const configuration = readSupabaseConfiguration();
  let response = NextResponse.next({ request });

  if (!configuration) {
    return response;
  }

  const supabase = createServerClient(configuration.url, configuration.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(values) {
        values.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        values.forEach(({ name, options, value }) => response.cookies.set(name, value, options));
      },
    },
  });

  await supabase.auth.getClaims();

  return response;
}
