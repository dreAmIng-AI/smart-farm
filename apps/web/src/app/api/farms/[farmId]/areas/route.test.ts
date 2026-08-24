import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";

import { GET, POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
  requireFarmManager: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const requireManager = vi.mocked(requireFarmManager);

describe("/api/farms/:farmId/areas", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmMaybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle: farmMaybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const areaOrder = vi.fn();
  const areaEq = vi.fn(() => ({ order: areaOrder }));
  const areaSelect = vi.fn(() => ({ eq: areaEq }));
  const areaInsertSingle = vi.fn();
  const areaInsertSelect = vi.fn(() => ({ single: areaInsertSingle }));
  const areaInsert = vi.fn(() => ({ select: areaInsertSelect }));
  const from = vi.fn((table: string) => {
    if (table === "farms") {
      return { select: farmSelect };
    }
    if (table === "farm_areas") {
      return { insert: areaInsert, select: areaSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    farmMaybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    areaOrder.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          name: "1동",
          description: "시설 재배 구역",
          created_at: "2026-08-24T00:00:00.000Z",
          updated_at: "2026-08-24T00:00:00.000Z",
        },
      ],
      error: null,
    });
    areaInsertSingle.mockResolvedValue({
      data: {
        id: "33333333-3333-4333-8333-333333333333",
        name: "2동",
        description: null,
        created_at: "2026-08-24T00:00:00.000Z",
        updated_at: "2026-08-24T00:00:00.000Z",
      },
      error: null,
    });
    requireManager.mockResolvedValue({ ok: true } as never);
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "test-user-id",
    } as never);
  });

  it("lists named FarmAreas from an accessible Farm", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/areas`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    expect(areaEq).toHaveBeenCalledWith("farm_id", farmId);
    await expect(response.json()).resolves.toMatchObject({
      items: [{ id: "22222222-2222-4222-8222-222222222222", name: "1동" }],
      meta: { count: 1 },
    });
  });

  it("creates a FarmArea only after the manager authorization check", async () => {
    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/areas`, {
        method: "POST",
        body: JSON.stringify({ name: "2동" }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(201);
    expect(requireManager).toHaveBeenCalledWith(expect.anything(), farmId);
    expect(areaInsert).toHaveBeenCalledWith({ farm_id: farmId, name: "2동", description: null });
  });

  it("does not query FarmAreas when RLS hides the Farm", async () => {
    farmMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/areas`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(404);
    expect(areaSelect).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_NOT_FOUND" } });
  });

  it("does not create a FarmArea for a farmer role", async () => {
    requireManager.mockResolvedValue({
      ok: false,
      response: Response.json(
        { error: { code: "FARM_MANAGEMENT_FORBIDDEN", message: "Forbidden" } },
        { status: 403 },
      ),
    } as never);

    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/areas`, {
        method: "POST",
        body: JSON.stringify({ name: "2동" }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(403);
    expect(areaInsert).not.toHaveBeenCalled();
  });
});
