import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
  requireFarmManager: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const requireManager = vi.mocked(requireFarmManager);

describe("PATCH/DELETE /api/farm-areas/:farmAreaId", () => {
  const farmAreaId = "11111111-1111-4111-8111-111111111111";
  const farmId = "22222222-2222-4222-8222-222222222222";
  const areaMaybeSingle = vi.fn();
  const areaLookupEq = vi.fn(() => ({ maybeSingle: areaMaybeSingle }));
  const areaSelect = vi.fn(() => ({ eq: areaLookupEq }));
  const updateSingle = vi.fn();
  const updateSelect = vi.fn(() => ({ single: updateSingle }));
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const deleteMaybeSingle = vi.fn();
  const deleteSelect = vi.fn(() => ({ maybeSingle: deleteMaybeSingle }));
  const deleteEq = vi.fn(() => ({ select: deleteSelect }));
  const remove = vi.fn(() => ({ eq: deleteEq }));
  const dependencyLimits = {
    crop_cycles: vi.fn(),
    farm_tasks: vi.fn(),
    measurements: vi.fn(),
    observations: vi.fn(),
  };
  const dependencyEqs = Object.fromEntries(
    Object.entries(dependencyLimits).map(([table, limit]) => [table, vi.fn(() => ({ limit }))]),
  ) as Record<keyof typeof dependencyLimits, ReturnType<typeof vi.fn>>;
  const dependencySelects = Object.fromEntries(
    Object.entries(dependencyEqs).map(([table, eq]) => [table, vi.fn(() => ({ eq }))]),
  ) as Record<keyof typeof dependencyLimits, ReturnType<typeof vi.fn>>;
  const from = vi.fn((table: string) => {
    if (table === "farm_areas") {
      return { delete: remove, select: areaSelect, update };
    }
    if (table in dependencySelects) {
      return { select: dependencySelects[table as keyof typeof dependencySelects] };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    areaMaybeSingle.mockResolvedValue({
      data: {
        id: farmAreaId,
        farm_id: farmId,
        name: "1동",
        description: "시설 재배 구역",
        created_at: "2026-08-24T00:00:00.000Z",
        updated_at: "2026-08-24T00:00:00.000Z",
      },
      error: null,
    });
    updateSingle.mockResolvedValue({
      data: {
        id: farmAreaId,
        farm_id: farmId,
        name: "1동 남쪽",
        description: "환기 확인 구역",
        created_at: "2026-08-24T00:00:00.000Z",
        updated_at: "2026-08-28T00:00:00.000Z",
      },
      error: null,
    });
    deleteMaybeSingle.mockResolvedValue({ data: { id: farmAreaId }, error: null });
    Object.values(dependencyLimits).forEach((limit) => limit.mockResolvedValue({ data: [], error: null }));
    requireManager.mockResolvedValue({ ok: true } as never);
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "test-user-id",
    } as never);
  });

  it("allows a Farm manager to rename a FarmArea", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/farm-areas/${farmAreaId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "1동 남쪽", description: "환기 확인 구역" }),
      }),
      { params: Promise.resolve({ farmAreaId }) },
    );

    expect(response.status).toBe(200);
    expect(requireManager).toHaveBeenCalledWith(expect.anything(), farmId);
    expect(update).toHaveBeenCalledWith({ name: "1동 남쪽", description: "환기 확인 구역" });
    await expect(response.json()).resolves.toMatchObject({ id: farmAreaId, farmId, name: "1동 남쪽" });
  });

  it("does not update a FarmArea for a farmer role", async () => {
    requireManager.mockResolvedValue({
      ok: false,
      response: Response.json({ error: { code: "FARM_MANAGEMENT_FORBIDDEN" } }, { status: 403 }),
    } as never);

    const response = await PATCH(
      new Request(`http://localhost/api/farm-areas/${farmAreaId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: "1동 남쪽" }),
      }),
      { params: Promise.resolve({ farmAreaId }) },
    );

    expect(response.status).toBe(403);
    expect(update).not.toHaveBeenCalled();
  });

  it("does not delete a FarmArea for a farmer role", async () => {
    requireManager.mockResolvedValue({
      ok: false,
      response: Response.json({ error: { code: "FARM_MANAGEMENT_FORBIDDEN" } }, { status: 403 }),
    } as never);

    const response = await DELETE(new Request(`http://localhost/api/farm-areas/${farmAreaId}`, { method: "DELETE" }), {
      params: Promise.resolve({ farmAreaId }),
    });

    expect(response.status).toBe(403);
    expect(remove).not.toHaveBeenCalled();
    expect(dependencySelects.crop_cycles).not.toHaveBeenCalled();
  });

  it("deletes an unused FarmArea only after checking every linked record type", async () => {
    const response = await DELETE(new Request(`http://localhost/api/farm-areas/${farmAreaId}`, { method: "DELETE" }), {
      params: Promise.resolve({ farmAreaId }),
    });

    expect(response.status).toBe(204);
    for (const table of Object.keys(dependencyEqs) as Array<keyof typeof dependencyEqs>) {
      expect(dependencyEqs[table]).toHaveBeenCalledWith("farm_area_id", farmAreaId);
    }
    expect(remove).toHaveBeenCalledOnce();
  });

  it("protects a FarmArea that is already connected to a CropCycle", async () => {
    dependencyLimits.crop_cycles.mockResolvedValue({ data: [{ id: "linked-cycle" }], error: null });

    const response = await DELETE(new Request(`http://localhost/api/farm-areas/${farmAreaId}`, { method: "DELETE" }), {
      params: Promise.resolve({ farmAreaId }),
    });

    expect(response.status).toBe(409);
    expect(remove).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_AREA_IN_USE" } });
  });

  it("keeps the database foreign-key protection when a record is linked during deletion", async () => {
    deleteMaybeSingle.mockResolvedValue({
      data: null,
      error: { code: "23503", message: "foreign key constraint" },
    });

    const response = await DELETE(new Request(`http://localhost/api/farm-areas/${farmAreaId}`, { method: "DELETE" }), {
      params: Promise.resolve({ farmAreaId }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_AREA_IN_USE" } });
  });

  it("rejects a malformed FarmArea id before querying Supabase", async () => {
    const response = await DELETE(new Request("http://localhost/api/farm-areas/not-a-uuid", { method: "DELETE" }), {
      params: Promise.resolve({ farmAreaId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(requireAuthenticatedUser).not.toHaveBeenCalled();
  });
});
