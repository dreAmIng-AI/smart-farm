import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/crop-cycles/:cropCycleId/tasks", () => {
  const cropCycleId = "11111111-1111-4111-8111-111111111111";
  const farmId = "22222222-2222-4222-8222-222222222222";
  const taskId = "33333333-3333-4333-8333-333333333333";
  const cropCycleMaybeSingle = vi.fn();
  const cropCycleEq = vi.fn(() => ({ maybeSingle: cropCycleMaybeSingle }));
  const cropCycleSelect = vi.fn(() => ({ eq: cropCycleEq }));
  const insertedTaskSingle = vi.fn();
  const insertedTaskSelect = vi.fn(() => ({ single: insertedTaskSingle }));
  const insertTask = vi.fn(() => ({ select: insertedTaskSelect }));
  const farmAreaMaybeSingle = vi.fn();
  const farmAreaEq = vi.fn(() => ({ maybeSingle: farmAreaMaybeSingle }));
  const farmAreaSelect = vi.fn(() => ({ eq: farmAreaEq }));
  const from = vi.fn((table: string) => {
    if (table === "crop_cycles") {
      return { select: cropCycleSelect };
    }

    if (table === "farm_tasks") {
      return { insert: insertTask };
    }

    if (table === "farm_areas") {
      return { select: farmAreaSelect };
    }

    throw new Error(`Unexpected table: ${table}`);
  });
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    cropCycleMaybeSingle.mockResolvedValue({
      data: { id: cropCycleId, farm_id: farmId, status: "active" },
      error: null,
    });
    insertedTaskSingle.mockResolvedValue({
      data: {
        id: taskId,
        assigned_user_id: null,
        farm_area_id: null,
        parent_issue_id: null,
        title: "Check ventilation",
        task_type: "manual",
        reason: "Operator-requested check.",
        priority: "medium",
        scheduled_for: "2026-08-13T15:00:00.000Z",
        evidence: [],
        verification_status: "draft",
        source_type: "manual",
        status: "pending",
        result_required: true,
      },
      error: null,
    });
    rpc.mockResolvedValue({ data: true, error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from, rpc }, userId: "test-user-id" } as never);
  });

  it("creates a draft manual FarmTask for an active manageable CropCycle", async () => {
    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks`, {
        body: JSON.stringify({
          title: "Check ventilation",
          reason: "Operator-requested check.",
          scheduledFor: "2026-08-14",
          priority: "medium",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("has_farm_role", {
      target_farm_id: farmId,
      allowed_roles: ["owner", "admin"],
    });
    expect(insertTask).toHaveBeenCalledWith(expect.objectContaining({
      crop_cycle_id: cropCycleId,
      farm_id: farmId,
      farm_area_id: null,
      scheduled_for: "2026-08-13T15:00:00.000Z",
      source_type: "manual",
      verification_status: "draft",
    }));
    await expect(response.json()).resolves.toMatchObject({
      farmTask: { id: taskId, assignedUserId: null, sourceType: "manual" },
    });
  });

  it("rejects a FarmArea from another Farm before creating a manual FarmTask", async () => {
    const otherFarmAreaId = "44444444-4444-4444-8444-444444444444";
    farmAreaMaybeSingle.mockResolvedValue({ data: { id: otherFarmAreaId, farm_id: "other-farm" }, error: null });

    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks`, {
        body: JSON.stringify({
          title: "Check ventilation",
          reason: "Operator-requested check.",
          farmAreaId: otherFarmAreaId,
          scheduledFor: "2026-08-14",
          priority: "medium",
        }),
        method: "POST",
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(404);
    expect(insertTask).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_AREA_NOT_FOUND" } });
  });

  it("rejects a closed CropCycle before creating a FarmTask", async () => {
    cropCycleMaybeSingle.mockResolvedValue({
      data: { id: cropCycleId, farm_id: farmId, status: "completed" },
      error: null,
    });

    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks`, {
        body: JSON.stringify({ title: "Check", reason: "Required check.", scheduledFor: "2026-08-14", priority: "medium" }),
        method: "POST",
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(409);
    expect(insertTask).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_NOT_ACTIVE" } });
  });

  it("does not disclose or create a task for an inaccessible CropCycle", async () => {
    cropCycleMaybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks`, {
        body: JSON.stringify({ title: "Check", reason: "Required check.", scheduledFor: "2026-08-14", priority: "medium" }),
        method: "POST",
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(404);
    expect(insertTask).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_NOT_FOUND" } });
  });

  it("does not insert a FarmTask when the user is not a Farm manager", async () => {
    rpc.mockResolvedValue({ data: false, error: null });

    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks`, {
        body: JSON.stringify({ title: "Check", reason: "Required check.", scheduledFor: "2026-08-14", priority: "medium" }),
        method: "POST",
      }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(403);
    expect(insertTask).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "FARM_MANAGEMENT_FORBIDDEN" } });
  });
});
