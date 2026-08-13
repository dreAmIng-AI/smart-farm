import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { PATCH } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("PATCH /api/issues/:issueId", () => {
  const issueId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const lookupEq = vi.fn(() => ({ maybeSingle }));
  const lookupSelect = vi.fn(() => ({ eq: lookupEq }));
  const updateSingle = vi.fn();
  const updateSelect = vi.fn(() => ({ single: updateSingle }));
  const updateEq = vi.fn(() => ({ select: updateSelect }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const from = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: issueId }, error: null });
    updateSingle.mockResolvedValue({
      data: { id: issueId, status: "resolved", resolved_at: "2026-08-13T01:00:00.000Z" },
      error: null,
    });
    from.mockImplementationOnce(() => ({ select: lookupSelect })).mockImplementationOnce(() => ({ update }));
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from },
      userId: "test-user-id",
    } as never);
  });

  it("marks an accessible issue as resolved and records its resolution time", async () => {
    const response = await PATCH(
      new Request(`http://localhost/api/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ issueId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      status: "resolved",
      resolved_at: expect.stringMatching(/^\d{4}-\d{2}-\d{2}T/),
    });
    await expect(response.json()).resolves.toMatchObject({
      issue: { id: issueId, status: "resolved", resolvedAt: "2026-08-13T01:00:00.000Z" },
    });
  });

  it("clears resolvedAt when moving an issue back to review", async () => {
    updateSingle.mockResolvedValue({ data: { id: issueId, status: "needs_review", resolved_at: null }, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "needs_review" }),
      }),
      { params: Promise.resolve({ issueId }) },
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({ status: "needs_review", resolved_at: null });
  });

  it("does not update an issue that is not accessible through RLS", async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null });

    const response = await PATCH(
      new Request(`http://localhost/api/issues/${issueId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "resolved" }),
      }),
      { params: Promise.resolve({ issueId }) },
    );

    expect(response.status).toBe(404);
    expect(update).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "ISSUE_NOT_FOUND" } });
  });
});
