import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { fetchKmaWeather, getKmaWeatherFailureCode } from "@/lib/integrations/kma-weather";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));
vi.mock("@/lib/integrations/kma-weather", () => ({
  KMA_WEATHER_SOURCE: {
    provider: "KMA",
    sourceName: "기상청 동네예보 격자자료",
    sourceReference: "https://example.test/kma",
  },
  fetchKmaWeather: vi.fn(),
  getKmaWeatherFailureCode: vi.fn(() => "KMA_UNKNOWN_ERROR"),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const fetchWeather = vi.mocked(fetchKmaWeather);
const getWeatherFailureCode = vi.mocked(getKmaWeatherFailureCode);

describe("GET /api/farms/:farmId/information/weather", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const snapshotMaybeSingle = vi.fn();
  const snapshotContextEq = vi.fn(() => ({ maybeSingle: snapshotMaybeSingle }));
  const snapshotModuleEq = vi.fn(() => ({ eq: snapshotContextEq }));
  const snapshotFarmEq = vi.fn(() => ({ eq: snapshotModuleEq }));
  const snapshotSelect = vi.fn(() => ({ eq: snapshotFarmEq }));
  const snapshotUpsert = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "farms") return { select: farmSelect };
    if (table === "external_data_snapshots") return { select: snapshotSelect, upsert: snapshotUpsert };
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId, weather_location_label: null, weather_grid_x: null, weather_grid_y: null }, error: null });
    snapshotMaybeSingle.mockResolvedValue({ data: null, error: null });
    snapshotUpsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "test-user" } as never);
  });

  it("returns a human-readable unavailable result before a Farm has a forecast location", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/weather`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "날씨를 보려면 농장 관리자가 예보 위치를 먼저 설정해 주세요.",
    });
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it("uses a fresh normalized cache result without calling KMA", async () => {
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId, weather_location_label: "서울", weather_grid_x: 60, weather_grid_y: 127 }, error: null });
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        context_key: "kma-v1:60:127",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        observed_at: "2026-08-25T00:00:00.000Z",
        published_at: "2026-08-25T00:00:00.000Z",
        retrieved_at: "2026-08-25T00:10:00.000Z",
        payload: { locationLabel: "서울", temperatureC: 27, humidityPercent: 60, windSpeedMps: 1, precipitationProbabilityPercent: 20, precipitationAmount: null, lowTemperatureC: 21, highTemperatureC: 31, observedAt: "2026-08-25T00:00:00.000Z", forecastPublishedAt: "2026-08-25T00:00:00.000Z" },
        provider: "KMA",
        source_name: "기상청 동네예보 격자자료",
        source_reference: "https://example.test/kma",
        verification_status: "official_source",
      },
      error: null,
    });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/weather`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "available", data: { temperatureC: 27 }, provenance: { freshness: "fresh", verificationStatus: "cached_official_source" } });
    expect(fetchWeather).not.toHaveBeenCalled();
  });

  it("keeps the last official result visible when KMA is temporarily unavailable", async () => {
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId, weather_location_label: "서울", weather_grid_x: 60, weather_grid_y: 127 }, error: null });
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        context_key: "kma-v1:60:127",
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        observed_at: "2026-08-25T00:00:00.000Z",
        published_at: "2026-08-25T00:00:00.000Z",
        retrieved_at: new Date(Date.now() - 60_000).toISOString(),
        payload: { locationLabel: "서울", temperatureC: 27, humidityPercent: 60, windSpeedMps: 1, precipitationProbabilityPercent: 20, precipitationAmount: null, lowTemperatureC: 21, highTemperatureC: 31, observedAt: "2026-08-25T00:00:00.000Z", forecastPublishedAt: "2026-08-25T00:00:00.000Z" },
        provider: "KMA",
        source_name: "기상청 동네예보 격자자료",
        source_reference: "https://example.test/kma",
        verification_status: "official_source",
      },
      error: null,
    });
    fetchWeather.mockRejectedValue(new Error("provider unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/weather`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "stale",
      data: { temperatureC: 27 },
      provenance: { freshness: "stale", verificationStatus: "cached_official_source" },
    });
  });

  it("logs a safe KMA cause while returning a Korean unavailable message", async () => {
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId, weather_location_label: "서울", weather_grid_x: 60, weather_grid_y: 127 }, error: null });
    fetchWeather.mockRejectedValue(new Error("raw provider payload must not be logged"));
    getWeatherFailureCode.mockReturnValue("KMA_FORECAST_API_KEY_NOT_CONFIGURED");
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/weather`), { params: Promise.resolve({ farmId }) });

    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "기상청 연결 설정을 아직 마치지 못했습니다. 농장 작업과 기록은 계속 사용할 수 있으며, 관리자에게 연결 상태를 확인해 달라고 알려 주세요.",
    });
    expect(consoleError).toHaveBeenCalledWith(JSON.stringify({
      event: "integration.weather.failed",
      provider: "KMA",
      code: "KMA_FORECAST_API_KEY_NOT_CONFIGURED",
    }));
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("raw provider payload"));
  });

  it("stores a normalized official response without exposing the KMA request", async () => {
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId, weather_location_label: "서울", weather_grid_x: 60, weather_grid_y: 127 }, error: null });
    fetchWeather.mockResolvedValue({
      locationLabel: "서울",
      temperatureC: 27,
      humidityPercent: 60,
      windSpeedMps: 1,
      precipitationProbabilityPercent: 20,
      precipitationAmount: null,
      lowTemperatureC: 21,
      highTemperatureC: 31,
      observedAt: "2026-08-25T00:00:00.000Z",
      forecastPublishedAt: "2026-08-25T00:00:00.000Z",
    });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/weather`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    expect(snapshotUpsert).toHaveBeenCalledWith(expect.objectContaining({
      farm_id: farmId,
      module: "weather",
      payload: expect.objectContaining({ temperatureC: 27 }),
    }), { onConflict: "farm_id,module,context_key" });
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      provenance: { provider: "KMA", freshness: "fresh", verificationStatus: "official_source" },
    });
  });
});
