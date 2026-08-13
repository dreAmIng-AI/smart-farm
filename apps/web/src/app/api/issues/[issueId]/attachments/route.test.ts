import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("POST /api/issues/:issueId/attachments", () => {
  const actionLogId = "11111111-1111-4111-8111-111111111111";
  const issueId = "22222222-2222-4222-8222-222222222222";
  const farmId = "33333333-3333-4333-8333-333333333333";
  const farmTaskId = "44444444-4444-4444-8444-444444444444";
  const issueMaybeSingle = vi.fn();
  const issueEq = vi.fn(() => ({ maybeSingle: issueMaybeSingle }));
  const issueSelect = vi.fn(() => ({ eq: issueEq }));
  const farmTaskMaybeSingle = vi.fn();
  const farmTaskEq = vi.fn(() => ({ maybeSingle: farmTaskMaybeSingle }));
  const farmTaskSelect = vi.fn(() => ({ eq: farmTaskEq }));
  const attachmentInsert = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  const storageFrom = vi.fn(() => ({ remove, upload }));
  const from = vi.fn((table: string) => {
    if (table === "issue_records") {
      return { select: issueSelect };
    }
    if (table === "farm_tasks") {
      return { select: farmTaskSelect };
    }
    return { insert: attachmentInsert };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    issueMaybeSingle.mockResolvedValue({
      data: { id: issueId, action_log_id: actionLogId, farm_task_id: farmTaskId },
      error: null,
    });
    farmTaskMaybeSingle.mockResolvedValue({ data: { id: farmTaskId, farm_id: farmId }, error: null });
    upload.mockResolvedValue({ error: null });
    attachmentInsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, storage: { from: storageFrom } },
      userId: "test-user-id",
    } as never);
  });

  it("links a photo to IssueRecord while using its ActionLog Storage path", async () => {
    const form = new FormData();
    form.append("file", new Blob([validPng], { type: "image/png" }), "issue-photo.png");
    const response = await POST(new Request(`http://localhost/api/issues/${issueId}/attachments`, { method: "POST", body: form }), {
      params: Promise.resolve({ issueId }),
    });

    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${farmId}/${actionLogId}/.+\\.png$`)),
      expect.any(File),
      { contentType: "image/png", upsert: false },
    );
    expect(attachmentInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action_log_id: null, issue_record_id: issueId }),
    );
  });
});
