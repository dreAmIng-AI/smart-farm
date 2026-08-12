import { NextResponse } from "next/server";

import { createServerSupabaseClient } from "@/lib/supabase/server";

export type AuthenticatedSupabaseContext = {
  ok: true;
  supabase: Awaited<ReturnType<typeof createServerSupabaseClient>>;
  userId: string;
};

export type UnauthenticatedSupabaseContext = {
  ok: false;
  response: NextResponse;
};

export function unauthenticatedResponse() {
  return NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Sign in is required." } },
    { status: 401 },
  );
}

export async function requireAuthenticatedSupabaseUser(): Promise<
  AuthenticatedSupabaseContext | UnauthenticatedSupabaseContext
> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, response: unauthenticatedResponse() };
    }

    return { ok: true, supabase, userId: user.id };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "SUPABASE_NOT_CONFIGURED",
            message: "Supabase environment variables are not configured.",
          },
        },
        { status: 503 },
      ),
    };
  }
}
