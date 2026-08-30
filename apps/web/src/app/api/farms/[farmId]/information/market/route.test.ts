import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import {
  fetchKamisNationalWholesaleReference,
  getKamisMarketFailureDetails,
} from "@/lib/integrations/kamis-market";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));
vi.mock("@/lib/integrations/kamis-market", () => ({
  KAMIS_MARKET_SOURCE: {
    provider: "KAMIS",
    sourceName: "농산물유통정보(KAMIS) 가격정보",
    sourceReference: "https://example.test/kamis",
  },
  fetchKamisNationalWholesaleReference: vi.fn(),
  getKamisMarketFailureDetails: vi.fn(() => ({ code: "KAMIS_UNKNOWN_ERROR" })),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const fetchMarketReference = vi.mocked(fetchKamisNationalWholesaleReference);
const getMarketFailureDetails = vi.mocked(getKamisMarketFailureDetails);

afterEach(() => {
  vi.restoreAllMocks();
});

describe("GET /api/farms/:farmId/information/market", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const cropCycleId = "22222222-2222-4222-8222-222222222222";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const cropMaybeSingle = vi.fn();
  const cropFarmEq = vi.fn(() => ({ maybeSingle: cropMaybeSingle }));
  const cropIdEq = vi.fn(() => ({ eq: cropFarmEq }));
  const cropSelect = vi.fn(() => ({ eq: cropIdEq }));
  const snapshotMaybeSingle = vi.fn();
  const snapshotContextEq = vi.fn(() => ({ maybeSingle: snapshotMaybeSingle }));
  const snapshotModuleEq = vi.fn(() => ({ eq: snapshotContextEq }));
  const snapshotFarmEq = vi.fn(() => ({ eq: snapshotModuleEq }));
  const snapshotSelect = vi.fn(() => ({ eq: snapshotFarmEq }));
  const snapshotUpsert = vi.fn();
  const from = vi.fn((table: string) => {
    if (table === "farms") return { select: farmSelect };
    if (table === "crop_cycles") return { select: cropSelect };
    if (table === "external_data_snapshots") return { select: snapshotSelect, upsert: snapshotUpsert };
    throw new Error(`Unexpected table: ${table}`);
  });
  const payload = {
    baseDate: "2026-08-26T15:00:00.000Z",
    grade: "상품",
    itemName: "딸기",
    kindName: "설향",
    marketName: "전체지역" as const,
    previousPriceWon: 18000,
    priceWon: 20000,
    unit: "2kg",
  };
  const request = () => new Request(`http://localhost/api/farms/${farmId}/information/market?cropCycleId=${cropCycleId}`);

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    cropMaybeSingle.mockResolvedValue({ data: { id: cropCycleId, farm_id: farmId, crop_code: "strawberry" }, error: null });
    snapshotMaybeSingle.mockResolvedValue({ data: null, error: null });
    snapshotUpsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "test-user" } as never);
  });

  it("requires an explicit CropCycle context without making Today fail", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/market`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "시장 참고가격을 보려면 현재 작기를 선택해 주세요.",
    });
    expect(requireAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("does not guess a market price for a Crop Pack without a KAMIS mapping", async () => {
    cropMaybeSingle.mockResolvedValue({ data: { id: cropCycleId, farm_id: farmId, crop_code: "test_crop" }, error: null });

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unavailable", data: null });
    expect(fetchMarketReference).not.toHaveBeenCalled();
  });

  it("uses a fresh nationwide market snapshot without calling KAMIS", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        observed_at: payload.baseDate,
        published_at: payload.baseDate,
        retrieved_at: "2026-08-27T00:10:00.000Z",
        payload,
        provider: "KAMIS",
        source_name: "농산물유통정보(KAMIS) 가격정보",
        source_reference: "https://example.test/kamis",
        verification_status: "official_source",
      },
      error: null,
    });

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      data: payload,
      provenance: { freshness: "fresh", verificationStatus: "cached_official_source" },
    });
    expect(fetchMarketReference).not.toHaveBeenCalled();
  });

  it("keeps the last official reference visible when KAMIS is unavailable", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        observed_at: payload.baseDate,
        published_at: payload.baseDate,
        retrieved_at: new Date(Date.now() - 60_000).toISOString(),
        payload,
        provider: "KAMIS",
        source_name: "농산물유통정보(KAMIS) 가격정보",
        source_reference: "https://example.test/kamis",
        verification_status: "official_source",
      },
      error: null,
    });
    fetchMarketReference.mockRejectedValue(new Error("provider unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    await expect(response.json()).resolves.toMatchObject({
      status: "stale",
      data: payload,
      provenance: { freshness: "stale", verificationStatus: "cached_official_source" },
    });
  });

  it("logs only a sanitized KAMIS failure classification", async () => {
    fetchMarketReference.mockRejectedValue(new Error("raw provider payload must not be logged"));
    getMarketFailureDetails.mockReturnValue({ code: "KAMIS_RESPONSE_ERROR", providerErrorCode: "901" });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    expect(consoleError).toHaveBeenCalledWith(JSON.stringify({
      event: "integration.market.failed",
      provider: "KAMIS",
      code: "KAMIS_RESPONSE_ERROR",
      providerErrorCode: "901",
    }));
    expect(consoleError).not.toHaveBeenCalledWith(expect.stringContaining("raw provider payload"));
  });

  it("explains when the recent official wholesale list has no exact Crop Pack item", async () => {
    fetchMarketReference.mockRejectedValue(new Error("provider item not found"));
    getMarketFailureDetails.mockReturnValue({ code: "KAMIS_ITEM_NOT_FOUND" });
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "최근 7일 안에 현재 작물의 전국 도매 참고가격이 공식 집계에서 확인되지 않았습니다. 출하 시기 또는 공식 집계 여부를 나중에 다시 확인해 주세요.",
    });
  });

  it("stores a Crop Pack-mapped nationwide wholesale reference", async () => {
    fetchMarketReference.mockResolvedValue(payload);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(fetchMarketReference).toHaveBeenCalledWith({ categoryCode: "400", grade: "상품", itemName: "딸기" });
    expect(snapshotUpsert).toHaveBeenCalledWith(expect.objectContaining({
      farm_id: farmId,
      module: "market",
      payload,
    }), { onConflict: "farm_id,module,context_key" });
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      provenance: { provider: "KAMIS", freshness: "fresh", verificationStatus: "official_source" },
    });
  });
});
