import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET /api/farms/:farmId/collaboration", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: {
        actorRole: "owner",
        invitations: [],
        members: [
          {
            userId: "22222222-2222-4222-8222-222222222222",
            email: "owner@example.com",
            role: "owner",
            createdAt: "2026-08-14T00:00:00.000Z",
          },
        ],
      },
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { rpc },
      userId: "22222222-2222-4222-8222-222222222222",
    } as never);
  });

  it("returns only the collaboration context authorized by the database RPC", async () => {
    const response = await GET(new Request(`http://localhost/api/farms/${farmId}/collaboration`), {
      params: Promise.resolve({ farmId }),
    });

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("get_farm_collaboration", { p_farm_id: farmId });
    await expect(response.json()).resolves.toMatchObject({
      actorRole: "owner",
      members: [{ email: "owner@example.com", role: "owner" }],
    });
  });

  it("rejects a malformed Farm identifier before querying Supabase", async () => {
    const response = await GET(new Request("http://localhost/api/farms/not-a-uuid/collaboration"), {
      params: Promise.resolve({ farmId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
