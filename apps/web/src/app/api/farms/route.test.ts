import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET, POST } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/farms", () => {
  const insert = vi.fn();
  const order = vi.fn();
  const select = vi.fn(() => ({ order }));
  const from = vi.fn(() => ({ insert, select }));
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: true, error: null });
    insert.mockResolvedValue({ error: null });
    order.mockResolvedValue({
      data: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Demo Farm",
          region_code: "KR-DEMO",
          cultivation_environment: "facility",
          cultivation_method: "protected_cultivation",
        },
      ],
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, rpc },
      userId: "test-user-id",
    } as never);
  });

  it("creates a Farm without an RLS-sensitive returning select", async () => {
    const response = await POST(
      new Request("http://localhost/api/farms", {
        method: "POST",
        body: JSON.stringify({
          name: "Demo Farm",
          regionCode: "KR-DEMO",
          cultivationEnvironment: "facility",
          cultivationMethod: "protected_cultivation",
        }),
      }),
    );

    expect(response.status).toBe(201);
    expect(from).toHaveBeenCalledWith("farms");
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: expect.any(String),
        name: "Demo Farm",
        region_code: "KR-DEMO",
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      id: expect.any(String),
      name: "Demo Farm",
      regionCode: "KR-DEMO",
    });
  });

  it("lists only Farms visible to the authenticated user", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("farms");
    expect(select).toHaveBeenCalledWith("id, name, region_code, cultivation_environment, cultivation_method");
    expect(order).toHaveBeenCalledWith("created_at", { ascending: false });
    await expect(response.json()).resolves.toEqual({
      items: [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: "Demo Farm",
          regionCode: "KR-DEMO",
          cultivationEnvironment: "facility",
          cultivationMethod: "protected_cultivation",
        },
      ],
      meta: { count: 1 },
      permissions: { canCreateFarm: true },
    });
  });

  it("does not create a Farm for an invited member without owner permission", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const response = await POST(
      new Request("http://localhost/api/farms", {
        method: "POST",
        body: JSON.stringify({
          name: "Other Farm",
          regionCode: "KR-DEMO",
          cultivationEnvironment: "facility",
        }),
      }),
    );

    expect(response.status).toBe(403);
    expect(insert).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_CREATION_FORBIDDEN" } });
  });
});
