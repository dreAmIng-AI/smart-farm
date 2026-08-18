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

type AuthorizationResult =
  | { ok: true }
  | {
      ok: false;
      response: NextResponse;
    };

type FarmCreationPermission =
  | { ok: true; canCreateFarm: boolean }
  | {
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

export async function getFarmCreationPermission(
  auth: AuthenticatedSupabaseContext,
): Promise<FarmCreationPermission> {
  const { data, error } = await auth.supabase.rpc("can_create_farms");

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "FARM_CREATION_PERMISSION_LOOKUP_FAILED", message: error.message } },
        { status: 400 },
      ),
    };
  }

  return { ok: true, canCreateFarm: data === true };
}

export async function requireFarmManager(
  auth: AuthenticatedSupabaseContext,
  farmId: string,
): Promise<AuthorizationResult> {
  const { data, error } = await auth.supabase.rpc("has_farm_role", {
    target_farm_id: farmId,
    allowed_roles: ["owner", "admin"],
  });

  if (error) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: { code: "FARM_PERMISSION_LOOKUP_FAILED", message: error.message } },
        { status: 400 },
      ),
    };
  }

  if (data !== true) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          error: {
            code: "FARM_MANAGEMENT_FORBIDDEN",
            message: "Only Farm owners or admins can change Farm plans and settings.",
          },
        },
        { status: 403 },
      ),
    };
  }

  return { ok: true };
}
