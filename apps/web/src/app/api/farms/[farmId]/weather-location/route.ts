import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseFarmWeatherLocationInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type WeatherLocationRow = {
  weather_grid_x: number;
  weather_grid_y: number;
  weather_location_label: string;
  weather_location_updated_at: string;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function toWeatherLocation(row: WeatherLocationRow) {
  return {
    label: row.weather_location_label,
    gridX: row.weather_grid_x,
    gridY: row.weather_grid_y,
    updatedAt: row.weather_location_updated_at,
  };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const parsed = parseFarmWeatherLocationInput(await request.json().catch(() => null));
  if (!parsed.ok) {
    return errorResponse("VALIDATION_ERROR", parsed.error, 400);
  }

  const { data: existing, error: lookupError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();
  if (lookupError) {
    return errorResponse("FARM_LOOKUP_FAILED", lookupError.message, 400);
  }
  if (!existing) {
    return errorResponse("FARM_NOT_FOUND", "Farm not found or not accessible.", 404);
  }

  const authorization = await requireFarmManager(auth, farmId);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { data, error } = await auth.supabase
    .from("farms")
    .update({
      weather_location_label: parsed.data.label,
      weather_grid_x: parsed.data.gridX,
      weather_grid_y: parsed.data.gridY,
      weather_location_updated_at: new Date().toISOString(),
    })
    .eq("id", farmId)
    .select("weather_location_label, weather_grid_x, weather_grid_y, weather_location_updated_at")
    .single();
  if (error) {
    return errorResponse("WEATHER_LOCATION_UPDATE_FAILED", error.message, 400);
  }

  return NextResponse.json({ weatherLocation: toWeatherLocation(data as WeatherLocationRow) });
}
