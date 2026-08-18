import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseCropCycleGrowthStageInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ cropCycleId: string }> };

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

  const { data, error } = await auth.supabase
    .from("crop_cycles")
    .update({ growth_stage: parsed.data.growthStage })
    .eq("id", cropCycleId)
    .select("id, farm_id, crop_code, cultivar, transplant_date, growth_stage, status, ended_at")
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
    transplantDate: data.transplant_date,
    growthStage: data.growth_stage,
    status: data.status,
    endedAt: data.ended_at,
  });
}
