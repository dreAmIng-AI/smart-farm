import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({ requireAuthenticatedSupabaseUser: vi.fn() }));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("POST /api/observations/:observationId/issues", () => {
  const observationId = "11111111-1111-4111-8111-111111111111";
  const observationMaybeSingle = vi.fn();
  const observationEq = vi.fn(() => ({ maybeSingle: observationMaybeSingle }));
  const observationSelect = vi.fn(() => ({ eq: observationEq }));
  const from = vi.fn(() => ({ select: observationSelect }));
  const rpc = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    observationMaybeSingle.mockResolvedValue({ data: { id: observationId, content: "잎에서 갈색 반점이 보임" }, error: null });
    rpc.mockResolvedValue({ data: [{ issue_id: "22222222-2222-4222-8222-222222222222", issue_status: "open" }], error: null });
    requireAuthenticatedUser.mockResolvedValue({ ok: true, supabase: { from, rpc }, userId: "test-user" } as never);
  });

  it("allows a Farm member to make one Observation an IssueRecord", async () => {
    const response = await POST(
      new Request(`http://localhost/api/observations/${observationId}/issues`, {
        method: "POST",
        body: JSON.stringify({ severity: "medium", expertReviewRequired: false }),
      }),
      { params: Promise.resolve({ observationId }) },
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith("create_observation_issue", {
      p_observation_id: observationId,
      p_severity: "medium",
      p_expert_review_required: false,
    });
    await expect(response.json()).resolves.toMatchObject({
      issue: { observationId, observedSymptom: "잎에서 갈색 반점이 보임", status: "open" },
    });
  });

  it("returns a conflict when the Observation already has an IssueRecord", async () => {
    rpc.mockResolvedValue({ data: null, error: { code: "23505", message: "duplicate key" } });
    const response = await POST(
      new Request(`http://localhost/api/observations/${observationId}/issues`, {
        method: "POST",
        body: JSON.stringify({ severity: "unknown", expertReviewRequired: false }),
      }),
      { params: Promise.resolve({ observationId }) },
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({ error: { code: "OBSERVATION_ALREADY_HAS_ISSUE" } });
  });

  it("does not create an Issue for an inaccessible Observation", async () => {
    observationMaybeSingle.mockResolvedValue({ data: null, error: null });
    const response = await POST(
      new Request(`http://localhost/api/observations/${observationId}/issues`, {
        method: "POST",
        body: JSON.stringify({ severity: "unknown", expertReviewRequired: false }),
      }),
      { params: Promise.resolve({ observationId }) },
    );

    expect(response.status).toBe(404);
    expect(rpc).not.toHaveBeenCalled();
  });
});
