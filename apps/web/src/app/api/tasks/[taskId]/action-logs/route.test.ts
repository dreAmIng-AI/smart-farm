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

  it("records a work start and moves a pending FarmTask to in progress", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          action_log_id: "22222222-2222-4222-8222-222222222222",
          task_status: "in_progress",
          completed_at: null,
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request(`http://localhost/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({
          actionType: "started",
          note: "현장 작업을 시작합니다.",
          performedAt: "2026-08-12T01:15:00.000Z",
        }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("record_farm_task_action", {
      p_action_type: "started",
      p_note: "현장 작업을 시작합니다.",
      p_performed_at: "2026-08-12T01:15:00.000Z",
      p_task_id: taskId,
    });
    await expect(response.json()).resolves.toMatchObject({
      actionLog: { actionType: "started", resultCode: "started" },
      task: { id: taskId, status: "in_progress", completedAt: null },
    });
  });

  it("rejects starting a FarmTask that is already in progress", async () => {
    maybeSingle.mockResolvedValue({ data: { id: taskId, status: "in_progress" }, error: null });

    const response = await POST(
      new Request(`http://localhost/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({ actionType: "started" }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({
      error: { code: "INVALID_STATUS_TRANSITION" },
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

  it("records an issue through the ActionLog endpoint and returns the linked IssueRecord", async () => {
    rpc.mockResolvedValue({
      data: [
        {
          action_log_id: "22222222-2222-4222-8222-222222222222",
          issue_id: "33333333-3333-4333-8333-333333333333",
          task_status: "issue_reported",
          issue_status: "open",
        },
      ],
      error: null,
    });

    const response = await POST(
      new Request(`http://localhost/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({
          actionType: "issue_reported",
          note: "Observed during planned work.",
          issue: {
            observedSymptom: "Observed an unexpected condition.",
            severity: "unknown",
            expertReviewRequired: true,
          },
        }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "record_farm_task_issue",
      expect.objectContaining({
        p_task_id: taskId,
        p_observed_symptom: "Observed an unexpected condition.",
        p_severity: "unknown",
        p_expert_review_required: true,
      }),
    );
    await expect(response.json()).resolves.toMatchObject({
      actionLog: { actionType: "issue_reported", resultCode: "observed_issue" },
      issue: { id: "33333333-3333-4333-8333-333333333333", status: "open" },
      task: { id: taskId, status: "issue_reported" },
    });
  });
});
