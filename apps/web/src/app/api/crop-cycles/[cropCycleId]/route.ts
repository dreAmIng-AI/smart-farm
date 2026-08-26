import { NextResponse } from "next/server";

import {
  requireAuthenticatedSupabaseUser,
  requireFarmManager,
  type AuthenticatedSupabaseContext,
} from "@/lib/api/auth";
import { isUuid, parseCropCycleGrowthStageInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ cropCycleId: string }> };

async function validateFarmArea(
  auth: AuthenticatedSupabaseContext,
  farmId: string,
  farmAreaId: string | null,
) {
  if (!farmAreaId) return { ok: true as const };
  const { data, error } = await auth.supabase
    .from("farm_areas")
    .select("id, farm_id")
    .eq("id", farmAreaId)
    .maybeSingle();
  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_AREA_LOOKUP_FAILED", message: error.message } },
        { status: 400 },
      ),
    };
  }
  if (!data || data.farm_id !== farmId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_AREA_NOT_FOUND", message: "FarmArea was not found in this Farm." } },
        { status: 404 },
      ),
    };
  }
  return { ok: true as const };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { cropCycleId } = await context.params;
  if (!isUuid(cropCycleId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "cropCycleId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseCropCycleGrowthStageInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: existing, error: lookupError } = await auth.supabase
    .from("crop_cycles")
    .select("id, farm_id")
    .eq("id", cropCycleId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_LOOKUP_FAILED", message: lookupError.message } },
      { status: 400 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_NOT_FOUND", message: "Crop cycle not found or not accessible." } },
      { status: 404 },
    );
  }

  const authorization = await requireFarmManager(auth, existing.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  if (parsed.data.farmAreaId !== undefined) {
    const farmArea = await validateFarmArea(auth, existing.farm_id, parsed.data.farmAreaId);
    if (!farmArea.ok) {
      return farmArea.response;
    }
  }

  const update: { farm_area_id?: string | null; growth_stage: string | null } = {
    growth_stage: parsed.data.growthStage,
  };
  if (parsed.data.farmAreaId !== undefined) {
    update.farm_area_id = parsed.data.farmAreaId;
  }

  const { data, error } = await auth.supabase
    .from("crop_cycles")
    .update(update)
    .eq("id", cropCycleId)
    .select("id, farm_id, farm_area_id, crop_code, cultivar, transplant_date, growth_stage, status, ended_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    id: data.id,
    farmId: data.farm_id,
    cropCode: data.crop_code,
    cultivar: data.cultivar,
    farmAreaId: data.farm_area_id,
    transplantDate: data.transplant_date,
    growthStage: data.growth_stage,
    status: data.status,
    endedAt: data.ended_at,
  });
}
