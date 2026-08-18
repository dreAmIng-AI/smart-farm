import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, POST } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET /api/farms/:farmId/crop-cycles", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const cropOrder = vi.fn();
  const cropEq = vi.fn(() => ({ order: cropOrder }));
  const cropSelect = vi.fn(() => ({ eq: cropEq }));
  const cropInsertSingle = vi.fn();
  const cropInsertSelect = vi.fn(() => ({ single: cropInsertSingle }));
  const cropInsert = vi.fn(() => ({ select: cropInsertSelect }));
  const from = vi.fn();
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    cropOrder.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          farm_id: farmId,
          crop_code: "strawberry",
          cultivar: "seolhyang",
          transplant_date: "2026-08-13",
          growth_stage: "establishment",
          status: "active",
          ended_at: null,
        },
      ],
      error: null,
    });
    cropInsertSingle.mockResolvedValue({
      data: {
        id: "33333333-3333-4333-8333-333333333333",
        farm_id: farmId,
        crop_code: "test_crop",
        cultivar: "test_variety",
        transplant_date: "2026-08-18",
        growth_stage: "establishment",
        status: "active",
        ended_at: null,
      },
      error: null,
    });
    from.mockImplementation((table: string) =>
      table === "farms" ? { select: farmSelect } : { select: cropSelect, insert: cropInsert },
    );
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, rpc },
      userId: "test-user-id",
    } as never);
  });

  it("lists CropCycles belonging to an accessible Farm", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/crop-cycles`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    expect(cropEq).toHaveBeenCalledWith("farm_id", farmId);
    expect(cropOrder).toHaveBeenCalledWith("transplant_date", { ascending: false });
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          farmId,
          cropCode: "strawberry",
          cultivar: "seolhyang",
          transplantDate: "2026-08-13",
          growthStage: "establishment",
          status: "active",
          endedAt: null,
        },
      ],
      meta: { count: 1 },
    });
  });

  it("does not query CropCycles when the Farm is hidden by RLS", async () => {
    farmMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/crop-cycles`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(404);
    expect(cropSelect).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_NOT_FOUND" } });
  });

  it("creates a CropCycle when the selected Farm role is owner or admin", async () => {
    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/crop-cycles`, {
        method: "POST",
        body: JSON.stringify({
          cropCode: "test_crop",
          cultivar: "test_variety",
          transplantDate: "2026-08-18",
          growthStage: "establishment",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(201);
    expect(cropInsert).toHaveBeenCalledWith({
      farm_id: farmId,
      crop_code: "test_crop",
      cultivar: "test_variety",
      transplant_date: "2026-08-18",
      growth_stage: "establishment",
    });
  });

  it("does not create a CropCycle for a farmer role", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/crop-cycles`, {
        method: "POST",
        body: JSON.stringify({
          cropCode: "test_crop",
          transplantDate: "2026-08-18",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(403);
    expect(cropInsert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_MANAGEMENT_FORBIDDEN" } });
  });
});
