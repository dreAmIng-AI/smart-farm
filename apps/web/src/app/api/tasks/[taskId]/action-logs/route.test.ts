import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/tasks/:taskId/action-logs", () => {
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();
  const taskId = "11111111-1111-4111-8111-111111111111";

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: taskId, status: "pending" }, error: null });
    rpc.mockResolvedValue({
      data: [
        {
          action_log_id: "22222222-2222-4222-8222-222222222222",
          task_status: "completed",
          completed_at: "2026-08-12T01:15:00.000Z",
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

  it("records completion and returns the updated FarmTask status", async () => {
    const response = await POST(
      new Request(`http://localhost/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({
          actionType: "completed",
          note: "작업을 완료했습니다.",
          performedAt: "2026-08-12T01:15:00.000Z",
        }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("record_farm_task_action", {
      p_action_type: "completed",
      p_note: "작업을 완료했습니다.",
      p_performed_at: "2026-08-12T01:15:00.000Z",
      p_task_id: taskId,
    });
    await expect(response.json()).resolves.toMatchObject({
      actionLog: { actionType: "completed", resultCode: "completed" },
      task: { id: taskId, status: "completed", completedAt: "2026-08-12T01:15:00.000Z" },
    });
  });

  it("rejects a result for an already completed FarmTask", async () => {
    maybeSingle.mockResolvedValue({ data: { id: taskId, status: "completed" }, error: null });

    const response = await POST(
      new Request(`http://localhost/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({ actionType: "completed" }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_STATUS_TRANSITION" },
    });
  });
});
