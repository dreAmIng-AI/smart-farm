import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET /api/tasks/:taskId", () => {
  const taskId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const from = vi.fn(() => ({ select: lookupSelect }));

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({
      data: {
        id: taskId,
        farm_id: "22222222-2222-4222-8222-222222222222",
        crop_cycle_id: "33333333-3333-4333-8333-333333333333",
        task_template_id: "44444444-4444-4444-8444-444444444444",
        parent_issue_id: null,
        title: "Development fixture task",
        task_type: "observation",
        reason: "Verify the Core task detail flow.",
        priority: "medium",
        scheduled_for: "2026-08-18T00:00:00.000Z",
        due_at: "2026-08-18T12:00:00.000Z",
        evidence: [{ source: "draft fixture" }],
        verification_status: "draft",
        source_type: "template",
        status: "pending",
        result_required: true,
        completed_at: null,
        created_at: "2026-08-17T00:00:00.000Z",
      },
      error: null,
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from } } as never);
  });

  it("returns an RLS-visible FarmTask with its execution context in camelCase", async () => {
    const response = await GET(new Request(`http://localhost/api/tasks/${taskId}`), {
      params: Promise.resolve({ taskId }),
    });

    expect(response.status).toBe(200);
    expect(from).toHaveBeenCalledWith("farm_tasks");
    expect(lookupEq).toHaveBeenCalledWith("id", taskId);
    await expect(response.json()).resolves.toMatchObject({
      id: taskId,
      taskTemplateId: "44444444-4444-4444-8444-444444444444",
      title: "Development fixture task",
      taskType: "observation",
      reason: "Verify the Core task detail flow.",
      dueAt: "2026-08-18T12:00:00.000Z",
      verificationStatus: "draft",
      resultRequired: true,
    });
  });

  it("rejects a malformed task id before querying Supabase", async () => {
    const response = await GET(new Request("http://localhost/api/tasks/not-a-uuid"), {
      params: Promise.resolve({ taskId: "not-a-uuid" }),
    });

    expect(response.status).toBe(400);
    expect(requireAuthenticatedUser).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });

  it("does not disclose a FarmTask hidden by RLS", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await GET(new Request(`http://localhost/api/tasks/${taskId}`), {
      params: Promise.resolve({ taskId }),
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "TASK_NOT_FOUND" } });
  });
});
