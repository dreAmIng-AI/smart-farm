import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, type AuthenticatedSupabaseContext } from "@/lib/api/auth";
import { isUuid, parseMeasurementInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type MeasurementRow = {
  created_at: string;
  crop_cycle_id: string | null;
  farm_area_id: string | null;
  id: string;
  metric_code: string;
  note: string | null;
  observed_at: string;
  recorded_by: string;
  unit: string;
  value_numeric: number | string;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

async function findAccessibleFarm(farmId: string, auth: AuthenticatedSupabaseContext) {
  const { data, error } = await auth.supabase.from("farms").select("id").eq("id", farmId).maybeSingle();
  if (error) return { ok: false as const, response: errorResponse("FARM_LOOKUP_FAILED", error.message, 400) };
  if (!data) return { ok: false as const, response: errorResponse("FARM_NOT_FOUND", "Farm not found or not accessible.", 404) };
  return { ok: true as const };
}

async function validateContext(
  auth: AuthenticatedSupabaseContext,
  farmId: string,
  table: "farm_areas" | "crop_cycles",
  value: string | null,
) {
  if (!value) return { ok: true as const };
  const { data, error } = await auth.supabase.from(table).select("id, farm_id").eq("id", value).maybeSingle();
  const label = table === "farm_areas" ? "FARM_AREA" : "CROP_CYCLE";
  if (error) return { ok: false as const, response: errorResponse(`${label}_LOOKUP_FAILED`, error.message, 400) };
  if (!data || data.farm_id !== farmId) {
    return { ok: false as const, response: errorResponse(`${label}_NOT_FOUND`, `${label} was not found in this Farm.`, 404) };
  }
  return { ok: true as const };
}

function toMeasurement(measurement: MeasurementRow) {
  return {
    id: measurement.id,
    farmAreaId: measurement.farm_area_id,
    cropCycleId: measurement.crop_cycle_id,
    recordedBy: measurement.recorded_by,
    observedAt: measurement.observed_at,
    metricCode: measurement.metric_code,
    valueNumeric: Number(measurement.value_numeric),
    unit: measurement.unit,
    note: measurement.note,
    createdAt: measurement.created_at,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) return auth.response;
  const farm = await findAccessibleFarm(farmId, auth);
  if (!farm.ok) return farm.response;

  const { data, error } = await auth.supabase
    .from("measurements")
    .select("id, farm_area_id, crop_cycle_id, recorded_by, observed_at, metric_code, value_numeric, unit, note, created_at")
    .eq("farm_id", farmId)
    .order("observed_at", { ascending: false });
  if (error) return errorResponse("MEASUREMENT_LOOKUP_FAILED", error.message, 400);
  const items = ((data ?? []) as MeasurementRow[]).map(toMeasurement);
  return NextResponse.json({ items, meta: { count: items.length } });
}

export async function POST(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) return auth.response;
  const parsed = parseMeasurementInput(await request.json().catch(() => null));
  if (!parsed.ok) return errorResponse("VALIDATION_ERROR", parsed.error, 400);
  const farm = await findAccessibleFarm(farmId, auth);
  if (!farm.ok) return farm.response;
  const area = await validateContext(auth, farmId, "farm_areas", parsed.data.farmAreaId);
  if (!area.ok) return area.response;
  const cycle = await validateContext(auth, farmId, "crop_cycles", parsed.data.cropCycleId);
  if (!cycle.ok) return cycle.response;

  const { data, error } = await auth.supabase
    .from("measurements")
    .insert({
      farm_id: farmId,
      farm_area_id: parsed.data.farmAreaId,
      crop_cycle_id: parsed.data.cropCycleId,
      recorded_by: auth.userId,
      observed_at: parsed.data.observedAt,
      metric_code: parsed.data.metricCode,
      value_numeric: parsed.data.valueNumeric,
      unit: parsed.data.unit,
      note: parsed.data.note,
    })
    .select("id, farm_area_id, crop_cycle_id, recorded_by, observed_at, metric_code, value_numeric, unit, note, created_at")
    .single();
  if (error) return errorResponse("MEASUREMENT_CREATE_FAILED", error.message, 400);
  return NextResponse.json(toMeasurement(data as MeasurementRow), { status: 201 });
}
