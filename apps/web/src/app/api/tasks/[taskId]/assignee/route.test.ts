import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { PATCH } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("PATCH /api/tasks/:taskId/assignee", () => {
  const taskId = "11111111-1111-4111-8111-111111111111";
  const farmId = "22222222-2222-4222-8222-222222222222";
  const assigneeUserId = "33333333-3333-4333-8333-333333333333";
  const maybeSingle = vi.fn();
  const eq = vi.fn(() => ({ maybeSingle }));
  const select = vi.fn(() => ({ eq }));
  const from = vi.fn(() => ({ select }));
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: taskId, farm_id: farmId, status: "pending" }, error: null });
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "has_farm_role") {
        return Promise.resolve({ data: true, error: null });
      }

      if (functionName === "assign_farm_task") {
        return Promise.resolve({
          data: [{ task_id: taskId, assigned_user_id: assigneeUserId }],
          error: null,
        });
      }

      throw new Error(`Unexpected RPC: ${functionName}`);
    });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from, rpc }, userId: "owner-id" } as never);
  });

  it("assigns a pending FarmTask through the role-checked database RPC", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${taskId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId: assigneeUserId }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("has_farm_role", {
      target_farm_id: farmId,
      allowed_roles: ["owner", "admin"],
    });
    expect(rpc).toHaveBeenCalledWith("assign_farm_task", {
      p_task_id: taskId,
      p_assigned_user_id: assigneeUserId,
    });
    await expect(response.json()).resolves.toEqual({
      task: { id: taskId, assignedUserId: assigneeUserId },
    });
  });

  it("allows a manager to clear an existing assignment", async () => {
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "has_farm_role") {
        return Promise.resolve({ data: true, error: null });
      }

      return Promise.resolve({ data: [{ task_id: taskId, assigned_user_id: null }], error: null });
    });

    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${taskId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId: null }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("assign_farm_task", {
      p_task_id: taskId,
      p_assigned_user_id: null,
    });
    await expect(response.json()).resolves.toEqual({ task: { id: taskId, assignedUserId: null } });
  });

  it("rejects assignment from a Farm member without manager rights", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${taskId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId: assigneeUserId }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(403);
    expect(rpc).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_MANAGEMENT_FORBIDDEN" } });
  });

  it("rejects assignment after a FarmTask is completed", async () => {
    maybeSingle.mockResolvedValue({ data: { id: taskId, farm_id: farmId, status: "completed" }, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${taskId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId: assigneeUserId }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(409);
    expect(rpc).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "INVALID_STATUS_TRANSITION" } });
  });

  it("does not accept a user outside the Farm when the database rejects it", async () => {
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "has_farm_role") {
        return Promise.resolve({ data: true, error: null });
      }

      return Promise.resolve({
        data: null,
        error: { message: "FarmTask assignee must be an active member of the Farm" },
      });
    });

    const response = await PATCH(
      new Request(`http://localhost/api/tasks/${taskId}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId: assigneeUserId }),
      }),
      { params: Promise.resolve({ taskId }) },
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "TASK_ASSIGNMENT_UPDATE_FAILED" } });
  });
});
