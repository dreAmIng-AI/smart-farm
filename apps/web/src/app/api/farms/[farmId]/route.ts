import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseFarmInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type FarmRow = {
  id: string;
  name: string;
  region_code: string;
  cultivation_environment: "facility" | "open_field";
  cultivation_method: string | null;
};

function farmResponse(farm: FarmRow) {
  return {
    id: farm.id,
    name: farm.name,
    regionCode: farm.region_code,
    cultivationEnvironment: farm.cultivation_environment,
    cultivationMethod: farm.cultivation_method,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("farms")
    .select("id, name, region_code, cultivation_environment, cultivation_method")
    .eq("id", farmId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
      { status: 404 },
    );
  }

  return NextResponse.json(farmResponse(data as FarmRow));
}

export async function PATCH(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: existing, error: lookupError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: lookupError.message } },
      { status: 400 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
      { status: 404 },
    );
  }

  const { data, error } = await auth.supabase
    .from("farms")
    .update({
      name: parsed.data.name,
      region_code: parsed.data.regionCode,
      cultivation_environment: parsed.data.cultivationEnvironment,
      cultivation_method: parsed.data.cultivationMethod,
    })
    .eq("id", farmId)
    .select("id, name, region_code, cultivation_environment, cultivation_method")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(farmResponse(data as FarmRow));
}
