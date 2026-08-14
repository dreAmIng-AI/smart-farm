import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { DELETE, PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("Farm member role routes", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const memberUserId = "22222222-2222-4222-8222-222222222222";
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({ data: [{ user_id: memberUserId, role: "admin" }], error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { rpc }, userId: "test-user-id" } as never);
  });

  it("sends role changes to the owner-checked RPC", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/farms/${farmId}/members/${memberUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: "admin" }),
      }),
      { params: Promise.resolve({ farmId, memberUserId }) },
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("update_farm_member_role", {
      p_farm_id: farmId,
      p_member_user_id: memberUserId,
      p_role: "admin",
    });
  });

  it("uses the removal RPC without exposing direct membership writes", async () => {
    rpc.mockResolvedValue({ error: null });
    const response = await DELETE(new Request(`http://localhost/api/farms/${farmId}/members/${memberUserId}`), {
      params: Promise.resolve({ farmId, memberUserId }),
    });

    expect(response.status).toBe(204);
    expect(rpc).toHaveBeenCalledWith("remove_farm_member", {
      p_farm_id: farmId,
      p_member_user_id: memberUserId,
    });
  });
});
