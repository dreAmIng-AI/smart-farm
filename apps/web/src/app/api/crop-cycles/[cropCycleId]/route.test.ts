import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("PATCH /api/crop-cycles/:cropCycleId", () => {
  const cropCycleId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const updateSingle = vi.fn();
  const updateSelect = vi.fn(() => ({ single: updateSingle }));
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: cropCycleId }, error: null });
    updateSingle.mockResolvedValue({
      data: {
        id: cropCycleId,
        farm_id: "22222222-2222-4222-8222-222222222222",
        crop_code: "test_crop",
        cultivar: "test_variety",
        transplant_date: "2026-08-13",
        growth_stage: "flowering",
        status: "active",
      },
      error: null,
    });
    from.mockImplementationOnce(() => ({ select: lookupSelect })).mockImplementationOnce(() => ({ update }));
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "test-user-id",
    } as never);
  });

  it("updates the existing generic growth stage without changing the CropCycle identity", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}`, {
        method: "PATCH",
        body: JSON.stringify({ growthStage: "flowering" }),
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ growth_stage: "flowering" });
    expect(updateEq).toHaveBeenCalledWith("id", cropCycleId);
    await expect(response.json()).resolves.toMatchObject({
      id: cropCycleId,
      cropCode: "test_crop",
      growthStage: "flowering",
    });
  });

  it("does not update a CropCycle that is not accessible through RLS", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}`, {
        method: "PATCH",
        body: JSON.stringify({ growthStage: "flowering" }),
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_NOT_FOUND" } });
  });
});
