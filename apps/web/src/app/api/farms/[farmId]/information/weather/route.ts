import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { fetchKmaWeather, KMA_WEATHER_SOURCE, type WeatherData } from "@/lib/integrations/kma-weather";

type RouteContext = { params: Promise<{ farmId: string }> };

type FarmWeatherRow = {
  id: string;
  weather_grid_x: number | null;
  weather_grid_y: number | null;
  weather_location_label: string | null;
};

type SnapshotRow = {
  context_key: string;
  expires_at: string;
  observed_at: string | null;
  payload: unknown;
  provider: string;
  published_at: string | null;
  retrieved_at: string;
  source_name: string;
  source_reference: string;
  verification_status: "official_source" | "cached_official_source";
};

type Provenance = {
  freshness: "fresh" | "stale";
  observedAt: string | null;
  provider: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceName: string;
  sourceReference: string;
  verificationStatus: "official_source" | "cached_official_source";
};

export type WeatherIntegrationResult =
  | { status: "available"; data: WeatherData; provenance: Provenance }
  | { status: "stale"; data: WeatherData; message: string; provenance: Provenance }
  | { status: "unavailable"; data: null; message: string };

const WEATHER_FRESH_TTL_MS = 30 * 60 * 1000;
const WEATHER_MAX_STALE_MS = 6 * 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isWeatherData(value: unknown): value is WeatherData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.locationLabel === "string" &&
    ["temperatureC", "humidityPercent", "windSpeedMps", "precipitationProbabilityPercent", "lowTemperatureC", "highTemperatureC"].every(
      (field) => data[field] === null || typeof data[field] === "number",
    ) &&
    (data.precipitationAmount === null || typeof data.precipitationAmount === "string") &&
    (data.observedAt === null || typeof data.observedAt === "string") &&
    (data.forecastPublishedAt === null || typeof data.forecastPublishedAt === "string");
}

function snapshotProvenance(snapshot: SnapshotRow, freshness: "fresh" | "stale"): Provenance {
  return {
    provider: snapshot.provider,
    sourceName: snapshot.source_name,
    sourceReference: snapshot.source_reference,
    observedAt: snapshot.observed_at,
    publishedAt: snapshot.published_at,
    retrievedAt: snapshot.retrieved_at,
    verificationStatus: "cached_official_source",
    freshness,
  };
}

function resultFromFreshSnapshot(snapshot: SnapshotRow): WeatherIntegrationResult | null {
  if (!isWeatherData(snapshot.payload) || new Date(snapshot.expires_at).getTime() < Date.now()) {
    return null;
  }

  return {
    status: "available",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "fresh"),
  };
}

function resultFromStaleSnapshot(snapshot: SnapshotRow | null): WeatherIntegrationResult | null {
  if (!snapshot || !isWeatherData(snapshot.payload)) return null;
  const age = Date.now() - new Date(snapshot.retrieved_at).getTime();
  if (!Number.isFinite(age) || age > WEATHER_MAX_STALE_MS) return null;

  return {
    status: "stale",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "stale"),
    message: "최신 날씨 정보를 불러오지 못했습니다. 마지막으로 확인한 공식 정보를 보여드립니다.",
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) return auth.response;

  const { data: farmData, error: farmError } = await auth.supabase
    .from("farms")
    .select("id, weather_location_label, weather_grid_x, weather_grid_y")
    .eq("id", farmId)
    .maybeSingle();
  if (farmError) return errorResponse("FARM_LOOKUP_FAILED", farmError.message, 400);
  if (!farmData) return errorResponse("FARM_NOT_FOUND", "Farm not found or not accessible.", 404);

  const farm = farmData as FarmWeatherRow;
  if (!farm.weather_location_label || !farm.weather_grid_x || !farm.weather_grid_y) {
    const result: WeatherIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "날씨를 보려면 농장 관리자가 예보 위치를 먼저 설정해 주세요.",
    };
    return NextResponse.json(result);
  }

  const contextKey = `kma-v1:${farm.weather_grid_x}:${farm.weather_grid_y}`;
  const { data: snapshotData } = await auth.supabase
    .from("external_data_snapshots")
    .select("context_key, expires_at, observed_at, payload, provider, published_at, retrieved_at, source_name, source_reference, verification_status")
    .eq("farm_id", farmId)
    .eq("module", "weather")
    .eq("context_key", contextKey)
    .maybeSingle();
  const snapshot = snapshotData as SnapshotRow | null;
  const cachedResult = snapshot ? resultFromFreshSnapshot(snapshot) : null;
  if (cachedResult) return NextResponse.json(cachedResult);

  try {
    const data = await fetchKmaWeather({
      gridX: farm.weather_grid_x,
      gridY: farm.weather_grid_y,
      locationLabel: farm.weather_location_label,
    });
    const now = new Date();
    const retrievedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + WEATHER_FRESH_TTL_MS).toISOString();
    const { error: snapshotError } = await auth.supabase
      .from("external_data_snapshots")
      .upsert(
        {
          farm_id: farmId,
          module: "weather",
          context_key: contextKey,
          payload: data,
          provider: KMA_WEATHER_SOURCE.provider,
          source_name: KMA_WEATHER_SOURCE.sourceName,
          source_reference: KMA_WEATHER_SOURCE.sourceReference,
          observed_at: data.observedAt,
          published_at: data.forecastPublishedAt,
          retrieved_at: retrievedAt,
          expires_at: expiresAt,
          verification_status: "official_source",
        },
        { onConflict: "farm_id,module,context_key" },
      );
    // A cache write failure must not discard an otherwise valid official response.
    void snapshotError;

    const result: WeatherIntegrationResult = {
      status: "available",
      data,
      provenance: {
        ...KMA_WEATHER_SOURCE,
        observedAt: data.observedAt,
        publishedAt: data.forecastPublishedAt,
        retrievedAt,
        verificationStatus: "official_source",
        freshness: "fresh",
      },
    };
    return NextResponse.json(result);
  } catch {
    const staleResult = resultFromStaleSnapshot(snapshot);
    if (staleResult) return NextResponse.json(staleResult);

    const result: WeatherIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "최신 날씨 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
    };
    return NextResponse.json(result);
  }
}
