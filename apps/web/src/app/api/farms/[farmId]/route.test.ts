import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET/PATCH /api/farms/:farmId", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const farmRow = {
    id: farmId,
    name: "Demo Farm",
    region_code: "KR-DEMO",
    cultivation_environment: "facility",
    cultivation_method: "protected_cultivation",
  };
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
    maybeSingle.mockResolvedValue({ data: farmRow, error: null });
    updateSingle.mockResolvedValue({ data: farmRow, error: null });
    from.mockImplementation(() => ({ select: lookupSelect, update }));
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "test-user-id",
    } as never);
  });

  it("returns an accessible Farm with camelCase fields", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: farmId,
      name: "Demo Farm",
      regionCode: "KR-DEMO",
      cultivationEnvironment: "facility",
      cultivationMethod: "protected_cultivation",
    });
  });

  it("updates only the supplied Farm basic information", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/farms/${farmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Farm",
          regionCode: "KR-NEW",
          cultivationEnvironment: "open_field",
          cultivationMethod: "soil_cultivation",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      name: "Updated Farm",
      region_code: "KR-NEW",
      cultivation_environment: "open_field",
      cultivation_method: "soil_cultivation",
    });
    expect(updateEq).toHaveBeenCalledWith("id", farmId);
  });

  it("rejects access to a Farm hidden by RLS without updating it", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/farms/${farmId}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: "Updated Farm",
          regionCode: "KR-NEW",
          cultivationEnvironment: "open_field",
          cultivationMethod: "soil_cultivation",
        }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_NOT_FOUND" } });
  });
});
