import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { PATCH } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("PATCH /api/crop-cycles/:cropCycleId/status", () => {
  const cropCycleId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const updateMaybeSingle = vi.fn();
  const updateSelect = vi.fn(() => ({ maybeSingle: updateMaybeSingle }));
  const updateStatusEq = vi.fn(() => ({ select: updateSelect }));
  const updateIdEq = vi.fn(() => ({ eq: updateStatusEq }));
  const update = vi.fn(() => ({ eq: updateIdEq }));
  const from = vi.fn(() => ({ select: lookupSelect, update }));
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    maybeSingle.mockResolvedValue({ data: { id: cropCycleId, status: "active", farm_id: "22222222-2222-4222-8222-222222222222" }, error: null });
    updateMaybeSingle.mockResolvedValue({
      data: {
        id: cropCycleId,
        farm_id: "22222222-2222-4222-8222-222222222222",
        crop_code: "test_crop",
        cultivar: "test_variety",
        farm_area_id: null,
        transplant_date: "2026-08-13",
        growth_stage: "flowering",
        status: "completed",
        ended_at: "2026-08-14T01:15:00.000Z",
      },
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, rpc },
      userId: "test-user-id",
    } as never);
  });

  it("ends an active CropCycle while preserving its identity and data", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "completed" }),
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "completed" });
    expect(updateIdEq).toHaveBeenCalledWith("id", cropCycleId);
    expect(updateStatusEq).toHaveBeenCalledWith("status", "active");
    await expect(response.json()).resolves.toMatchObject({
      id: cropCycleId,
      cropCode: "test_crop",
      status: "completed",
      farmAreaId: null,
      endedAt: "2026-08-14T01:15:00.000Z",
    });
  });

  it("does not update a CropCycle that is not accessible through RLS", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_NOT_FOUND" } });
  });

  it("does not reopen or re-end an already ended CropCycle", async () => {
    maybeSingle.mockResolvedValue({ data: { id: cropCycleId, status: "completed" }, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(409);
    expect(update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_ALREADY_ENDED" } });
  });
});
