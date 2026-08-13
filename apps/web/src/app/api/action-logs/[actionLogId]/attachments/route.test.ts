import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { POST } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);
const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function pngRequest(url: string) {
  const form = new FormData();
  form.append("file", new Blob([validPng], { type: "image/png" }), "field-photo.png");
  return new Request(url, { method: "POST", body: form });
}

describe("POST /api/action-logs/:actionLogId/attachments", () => {
  const actionLogId = "11111111-1111-4111-8111-111111111111";
  const farmId = "22222222-2222-4222-8222-222222222222";
  const farmTaskId = "33333333-3333-4333-8333-333333333333";
  const actionLogMaybeSingle = vi.fn();
  const actionLogEq = vi.fn(() => ({ maybeSingle: actionLogMaybeSingle }));
  const actionLogSelect = vi.fn(() => ({ eq: actionLogEq }));
  const farmTaskMaybeSingle = vi.fn();
  const farmTaskEq = vi.fn(() => ({ maybeSingle: farmTaskMaybeSingle }));
  const farmTaskSelect = vi.fn(() => ({ eq: farmTaskEq }));
  const attachmentInsert = vi.fn();
  const upload = vi.fn();
  const remove = vi.fn();
  const storageFrom = vi.fn(() => ({ remove, upload }));
  const from = vi.fn((table: string) => {
    if (table === "action_logs") {
      return { select: actionLogSelect };
    }
    if (table === "farm_tasks") {
      return { select: farmTaskSelect };
    }
    return { insert: attachmentInsert };
  });

  beforeEach(() => {
    vi.clearAllMocks();
    actionLogMaybeSingle.mockResolvedValue({ data: { id: actionLogId, farm_task_id: farmTaskId }, error: null });
    farmTaskMaybeSingle.mockResolvedValue({ data: { id: farmTaskId, farm_id: farmId }, error: null });
    upload.mockResolvedValue({ error: null });
    attachmentInsert.mockResolvedValue({ error: null });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, storage: { from: storageFrom } },
      userId: "test-user-id",
    } as never);
  });

  it("stores a validated image in private Storage and links it to the ActionLog", async () => {
    const response = await POST(pngRequest(`http://localhost/api/action-logs/${actionLogId}/attachments`), {
      params: Promise.resolve({ actionLogId }),
    });

    expect(response.status).toBe(201);
    expect(upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${farmId}/${actionLogId}/.+\\.png$`)),
      expect.any(File),
      { contentType: "image/png", upsert: false },
    );
    expect(attachmentInsert).toHaveBeenCalledWith(
      expect.objectContaining({ action_log_id: actionLogId, issue_record_id: null, mime_type: "image/png" }),
    );
    expect(remove).not.toHaveBeenCalled();
  });

  it("rejects an invalid file before accessing the ActionLog", async () => {
    const form = new FormData();
    form.append("file", new Blob([validPng], { type: "image/gif" }), "field-photo.gif");

    const response = await POST(
      new Request(`http://localhost/api/action-logs/${actionLogId}/attachments`, { method: "POST", body: form }),
      { params: Promise.resolve({ actionLogId }) },
    );

    expect(response.status).toBe(400);
    expect(actionLogSelect).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toMatchObject({ error: { code: "VALIDATION_ERROR" } });
  });
});
