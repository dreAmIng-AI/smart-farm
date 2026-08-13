import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/issues/:issueId/follow-up-tasks", () => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const issueId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: issueId, status: "open" }, error: null });
    rpc.mockResolvedValue({
      data: [
        {
          farm_task_id: "22222222-2222-4222-8222-222222222222",
          task_status: "pending",
          scheduled_for: "2026-08-13T15:00:00.000Z",
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

  it("creates a generic issue follow-up and preserves the IssueRecord reference", async () => {
    const response = await POST(
      new Request(`http://localhost/api/issues/${issueId}/follow-up-tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: "Recheck observed issue",
          scheduledFor: "2026-08-14",
          priority: "medium",
        }),
      }),
      { params: Promise.resolve({ issueId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("create_issue_follow_up_task", {
      p_issue_id: issueId,
      p_priority: "medium",
      p_scheduled_for: "2026-08-13T15:00:00.000Z",
      p_title: "Recheck observed issue",
    });
    await expect(response.json()).resolves.toMatchObject({
      farmTask: {
        id: "22222222-2222-4222-8222-222222222222",
        parentIssueId: issueId,
        sourceType: "issue_followup",
      },
    });
  });

  it("rejects a follow-up for a resolved issue before calling the RPC", async () => {
    maybeSingle.mockResolvedValue({ data: { id: issueId, status: "resolved" }, error: null });

    const response = await POST(
      new Request(`http://localhost/api/issues/${issueId}/follow-up-tasks`, {
        method: "POST",
        body: JSON.stringify({ title: "Recheck", scheduledFor: "2026-08-14", priority: "medium" }),
      }),
      { params: Promise.resolve({ issueId }) },
    );

    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_STATUS_TRANSITION" },
    });
  });
});
