import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { fetchNongsaroCropReference } from "@/lib/integrations/nongsaro-crop-reference";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));
vi.mock("@/lib/integrations/nongsaro-crop-reference", () => ({
  NONGSARO_CROP_REFERENCE_SOURCE: {
    provider: "Nongsaro",
    sourceName: "농사로 작목기술 서비스",
    sourceReference: "https://example.test/nongsaro-crop-tech",
  },
  fetchNongsaroCropReference: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const fetchCropReference = vi.mocked(fetchNongsaroCropReference);

describe("GET /api/farms/:farmId/information/crop", () => {
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
    officialCropName: "딸기",
    items: [{ title: "딸기 병해충 관리 참고자료", publishedAt: "2026-08-13T15:00:00.000Z", referenceUrl: "https://www.nongsaro.go.kr/reference.pdf" }],
  };
  const request = () => new Request(`http://localhost/api/farms/${farmId}/information/crop?cropCycleId=${cropCycleId}`);

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    cropMaybeSingle.mockResolvedValue({ data: { id: cropCycleId, farm_id: farmId, crop_code: "strawberry" }, error: null });
    snapshotMaybeSingle.mockResolvedValue({ data: null, error: null });
    snapshotUpsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "test-user" } as never);
  });

  it("requires an explicit CropCycle context without making Today fail", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/crop`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "재배 참고자료를 보려면 현재 작기를 선택해 주세요.",
    });
    expect(requireAuthenticatedUser).not.toHaveBeenCalled();
  });

  it("does not guess official material for a Crop Pack without a provider mapping", async () => {
    cropMaybeSingle.mockResolvedValue({ data: { id: cropCycleId, farm_id: farmId, crop_code: "test_crop" }, error: null });

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ status: "unavailable", data: null });
    expect(fetchCropReference).not.toHaveBeenCalled();
  });

  it("uses a fresh Crop Pack-scoped cache result without calling Nongsaro", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        observed_at: null,
        published_at: "2026-08-13T15:00:00.000Z",
        retrieved_at: "2026-08-25T00:10:00.000Z",
        payload,
        provider: "Nongsaro",
        source_name: "농사로 작목기술 서비스",
        source_reference: "https://example.test/nongsaro-crop-tech",
        verification_status: "official_source",
      },
      error: null,
    });

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      data: payload,
      provenance: { freshness: "fresh", verificationStatus: "cached_official_source" },
    });
    expect(fetchCropReference).not.toHaveBeenCalled();
  });

  it("keeps the last official Crop Pack reference visible when the provider is unavailable", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        observed_at: null,
        published_at: "2026-08-13T15:00:00.000Z",
        retrieved_at: new Date(Date.now() - 60_000).toISOString(),
        payload,
        provider: "Nongsaro",
        source_name: "농사로 작목기술 서비스",
        source_reference: "https://example.test/nongsaro-crop-tech",
        verification_status: "official_source",
      },
      error: null,
    });
    fetchCropReference.mockRejectedValue(new Error("provider unavailable"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "stale",
      data: payload,
      provenance: { freshness: "stale", verificationStatus: "cached_official_source" },
    });
  });

  it("does not replace an exact crop match with unrelated material when Nongsaro cannot find it", async () => {
    fetchCropReference.mockRejectedValue(new Error("NONGSARO_CROP_NOT_FOUND"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    await expect(response.json()).resolves.toEqual({
      status: "unavailable",
      data: null,
      message: "현재 작물에 맞는 공식 재배 참고자료를 아직 확인하지 못했습니다. 다른 작물의 자료를 대신 보여 주지는 않습니다.",
    });
  });

  it("stores a normalized official crop reference without a crop-specific Core branch", async () => {
    fetchCropReference.mockResolvedValue(payload);

    const response = await GET(request(), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    expect(fetchCropReference).toHaveBeenCalledWith("딸기");
    expect(snapshotUpsert).toHaveBeenCalledWith(expect.objectContaining({
      farm_id: farmId,
      module: "crop_information",
      payload,
    }), { onConflict: "farm_id,module,context_key" });
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      provenance: { provider: "Nongsaro", freshness: "fresh", verificationStatus: "official_source" },
    });
  });
});
