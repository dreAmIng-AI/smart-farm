import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/farms", () => {
  const insert = vi.fn();
  const from = vi.fn(() => ({ insert }));

  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
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
});
