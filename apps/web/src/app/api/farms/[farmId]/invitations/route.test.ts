import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/farms/:farmId/invitations", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const token = "33333333-3333-4333-8333-333333333333";
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    rpc.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          email: "farmer@example.com",
          role: "farmer",
          token,
          expires_at: "2026-08-21T00:00:00.000Z",
        },
      ],
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { rpc }, userId: "test-user-id" } as never);
  });

  it("creates a direct-share invitation link through the role-checked RPC", async () => {
    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: "FARMER@example.com", role: "farmer" }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("create_farm_invitation", {
      p_email: "farmer@example.com",
      p_farm_id: farmId,
      p_role: "farmer",
    });
    await expect(response.json()).resolves.toMatchObject({
      email: "farmer@example.com",
      inviteUrl: `http://localhost/?invite=${token}`,
    });
  });

  it("does not call the invitation RPC for an invalid email or owner role", async () => {
    const response = await POST(
      new Request(`http://localhost/api/farms/${farmId}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email", role: "owner" }),
      }),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
