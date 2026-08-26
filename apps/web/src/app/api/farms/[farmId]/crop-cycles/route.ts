import { NextResponse } from "next/server";

import {
  requireAuthenticatedSupabaseUser,
  requireFarmManager,
  type AuthenticatedSupabaseContext,
} from "@/lib/api/auth";
import { isUuid, parseCropCycleInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type CropCycleRow = {
  id: string;
  farm_id: string;
  crop_code: string;
  cultivar: string | null;
  farm_area_id: string | null;
  transplant_date: string;
  growth_stage: string | null;
  status: "active" | "completed" | "cancelled";
  ended_at: string | null;
};

function toCropCycle(cropCycle: CropCycleRow) {
  return {
    id: cropCycle.id,
    farmId: cropCycle.farm_id,
    cropCode: cropCycle.crop_code,
    cultivar: cropCycle.cultivar,
    farmAreaId: cropCycle.farm_area_id,
    transplantDate: cropCycle.transplant_date,
    growthStage: cropCycle.growth_stage,
    status: cropCycle.status,
    endedAt: cropCycle.ended_at,
  };
}

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

  const { data: farm, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();

  if (farmError) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: farmError.message } },
      { status: 400 },
    );
  }

  if (!farm) {
    return NextResponse.json(
      { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
      { status: 404 },
    );
  }

  const { data, error } = await auth.supabase
    .from("crop_cycles")
    .select("id, farm_id, farm_area_id, crop_code, cultivar, transplant_date, growth_stage, status, ended_at")
    .eq("farm_id", farmId)
    .order("transplant_date", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const items = ((data ?? []) as CropCycleRow[]).map(toCropCycle);

  return NextResponse.json({ items, meta: { count: items.length } });
}

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = parseCropCycleInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: farm, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();

  if (farmError) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: farmError.message } },
      { status: 400 },
    );
  }

  if (!farm) {
    return NextResponse.json(
      { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
      { status: 404 },
    );
  }

  const authorization = await requireFarmManager(auth, farmId);
  if (!authorization.ok) {
    return authorization.response;
  }

  const farmArea = await validateFarmArea(auth, farmId, parsed.data.farmAreaId);
  if (!farmArea.ok) {
    return farmArea.response;
  }

  const { data, error } = await auth.supabase
    .from("crop_cycles")
    .insert({
      farm_id: farmId,
      farm_area_id: parsed.data.farmAreaId,
      crop_code: parsed.data.cropCode,
      cultivar: parsed.data.cultivar,
      transplant_date: parsed.data.transplantDate,
      growth_stage: parsed.data.growthStage,
    })
    .select("id, farm_id, farm_area_id, crop_code, cultivar, transplant_date, growth_stage, status, ended_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_CREATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(toCropCycle(data as CropCycleRow), { status: 201 });
}
