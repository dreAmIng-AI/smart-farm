import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/farm-invitations/accept", () => {
  const token = "33333333-3333-4333-8333-333333333333";
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: [{ farm_id: "11111111-1111-4111-8111-111111111111", role: "farmer" }],
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { rpc }, userId: "test-user-id" } as never);
  });

  it("accepts a UUID token through the database transaction", async () => {
    const response = await POST(
      new Request("http://localhost/api/farm-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("accept_farm_invitation", { p_token: token });
    await expect(response.json()).resolves.toEqual({
      farmId: "11111111-1111-4111-8111-111111111111",
      role: "farmer",
    });
  });

  it("rejects a token that is not a UUID", async () => {
    const response = await POST(
      new Request("http://localhost/api/farm-invitations/accept", {
        method: "POST",
        body: JSON.stringify({ token: "not-a-token" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
