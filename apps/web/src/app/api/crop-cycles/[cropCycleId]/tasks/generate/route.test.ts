import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", async (importOriginal) => ({
  ...(await importOriginal()),
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/crop-cycles/:cropCycleId/tasks/generate", () => {
  const cropCycleId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const rpc = vi.fn();
  const from = vi.fn(() => ({ select: lookupSelect }));

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({
      data: { id: cropCycleId, status: "active", farm_id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });
    rpc.mockImplementation((functionName: string) => {
      if (functionName === "has_farm_role") {
        return Promise.resolve({ data: true, error: null });
      }

      return Promise.resolve({ data: [{ generated_count: 2, task_ids: ["task-1", "task-2"] }], error: null });
    });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, rpc },
      userId: "test-user-id",
    } as never);
  });

  it("generates tasks for an active CropCycle", async () => {
    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks/generate`, { method: "POST" }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("generate_planned_farm_tasks", { p_crop_cycle_id: cropCycleId });
  });

  it("rejects task generation for an ended CropCycle before calling the RPC", async () => {
    maybeSingle.mockResolvedValue({
      data: { id: cropCycleId, status: "completed", farm_id: "22222222-2222-4222-8222-222222222222" },
      error: null,
    });

    const response = await POST(
      new Request(`http://localhost/api/crop-cycles/${cropCycleId}/tasks/generate`, { method: "POST" }),
      { params: Promise.resolve({ cropCycleId }) },
    );

    expect(response.status).toBe(409);
    expect(rpc).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "CROP_CYCLE_NOT_ACTIVE" } });
  });
});
