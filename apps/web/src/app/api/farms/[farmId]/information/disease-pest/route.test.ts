import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { fetchNongsaroDiseasePest } from "@/lib/integrations/nongsaro-disease-pest";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));
vi.mock("@/lib/integrations/nongsaro-disease-pest", () => ({
  NONGSARO_DISEASE_PEST_SOURCE: {
    provider: "Nongsaro",
    sourceName: "농사로 병해충 발생정보",
    sourceReference: "https://example.test/nongsaro",
  },
  fetchNongsaroDiseasePest: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const fetchDiseasePest = vi.mocked(fetchNongsaroDiseasePest);

describe("GET /api/farms/:farmId/information/disease-pest", () => {
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
  const payload = {
    scope: "national_occurrence_bulletin" as const,
    bulletins: [{ title: "병해충발생정보 제 11호", publishedAt: "2026-08-13T15:00:00.000Z", attachmentUrl: "https://www.nongsaro.go.kr/bulletin.pdf" }],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    snapshotMaybeSingle.mockResolvedValue({ data: null, error: null });
    snapshotUpsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from }, userId: "test-user" } as never);
  });

  it("uses a fresh normalized cache result without calling Nongsaro", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        observed_at: null,
        published_at: "2026-08-13T15:00:00.000Z",
        retrieved_at: "2026-08-25T00:10:00.000Z",
        payload,
        provider: "Nongsaro",
        source_name: "농사로 병해충 발생정보",
        source_reference: "https://example.test/nongsaro",
        verification_status: "official_source",
      },
      error: null,
    });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      data: payload,
      provenance: { freshness: "fresh", verificationStatus: "cached_official_source" },
    });
    expect(fetchDiseasePest).not.toHaveBeenCalled();
  });

  it("keeps the last official result visible when Nongsaro is temporarily unavailable", async () => {
    snapshotMaybeSingle.mockResolvedValue({
      data: {
        expires_at: new Date(Date.now() - 60_000).toISOString(),
        observed_at: null,
        published_at: "2026-08-13T15:00:00.000Z",
        retrieved_at: new Date(Date.now() - 60_000).toISOString(),
        payload,
        provider: "Nongsaro",
        source_name: "농사로 병해충 발생정보",
        source_reference: "https://example.test/nongsaro",
        verification_status: "official_source",
      },
      error: null,
    });
    fetchDiseasePest.mockRejectedValue(new Error("provider unavailable"));

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      status: "stale",
      data: payload,
      provenance: { freshness: "stale", verificationStatus: "cached_official_source" },
    });
  });

  it("stores a normalized official result and does not require crop-specific core data", async () => {
    fetchDiseasePest.mockResolvedValue(payload);

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/information/disease-pest`), { params: Promise.resolve({ farmId }) });

    expect(response.status).toBe(200);
    expect(snapshotUpsert).toHaveBeenCalledWith(expect.objectContaining({
      farm_id: farmId,
      module: "disease_pest",
      payload,
    }), { onConflict: "farm_id,module,context_key" });
    await expect(response.json()).resolves.toMatchObject({
      status: "available",
      provenance: { provider: "Nongsaro", freshness: "fresh", verificationStatus: "official_source" },
    });
  });
});
