import { beforeEach, describe, expect, it, vi } from "vitest";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";

import { GET } from "./route";

vi.mock("@/lib/api/auth", () => ({
  requireAuthenticatedSupabaseUser: vi.fn(),
}));

const requireAuthenticatedUser = vi.mocked(requireAuthenticatedSupabaseUser);

describe("GET /api/farms/:farmId/history", () => {
  const farmId = "11111111-1111-4111-8111-111111111111";
  const maybeSingle = vi.fn();
  const farmEq = vi.fn(() => ({ maybeSingle }));
  const farmSelect = vi.fn(() => ({ eq: farmEq }));
  const taskEq = vi.fn();
  const taskSelect = vi.fn(() => ({ eq: taskEq }));
  const actionLogIn = vi.fn();
  const actionLogSelect = vi.fn(() => ({ in: actionLogIn }));
  const issueIn = vi.fn();
  const issueSelect = vi.fn(() => ({ in: issueIn }));
  const attachmentIn = vi.fn();
  const attachmentSelect = vi.fn(() => ({ in: attachmentIn }));
  const createSignedUrl = vi.fn();
  const storageFrom = vi.fn(() => ({ createSignedUrl }));
  const from = vi.fn((table: string) => {
    if (table === "farms") {
      return { select: farmSelect };
    }
    if (table === "farm_tasks") {
      return { select: taskSelect };
    }
    if (table === "action_logs") {
      return { select: actionLogSelect };
    }
    if (table === "issue_records") {
      return { select: issueSelect };
    }
    if (table === "attachments") {
      return { select: attachmentSelect };
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingle.mockResolvedValue({ data: { id: farmId }, error: null });
    taskEq.mockResolvedValue({
      data: [
        {
          id: "22222222-2222-4222-8222-222222222222",
          title: "Original task",
          source_type: "template",
          status: "issue_reported",
          scheduled_for: "2026-08-12T15:00:00.000Z",
          created_at: "2026-08-12T15:00:00.000Z",
          parent_issue_id: null,
        },
        {
          id: "33333333-3333-4333-8333-333333333333",
          title: "Recheck issue",
          source_type: "issue_followup",
          status: "pending",
          scheduled_for: "2026-08-14T15:00:00.000Z",
          created_at: "2026-08-13T01:00:00.000Z",
          parent_issue_id: "44444444-4444-4444-8444-444444444444",
        },
      ],
      error: null,
    });
    actionLogIn.mockResolvedValue({
      data: [
        {
          id: "55555555-5555-4555-8555-555555555555",
          farm_task_id: "22222222-2222-4222-8222-222222222222",
          action_type: "issue_reported",
          result_code: "observed_issue",
          note: "Observed during work.",
          performed_at: "2026-08-13T00:00:00.000Z",
        },
      ],
      error: null,
    });
    issueIn.mockResolvedValue({
      data: [
        {
          id: "44444444-4444-4444-8444-444444444444",
          action_log_id: "55555555-5555-4555-8555-555555555555",
          farm_task_id: "22222222-2222-4222-8222-222222222222",
          observed_symptom: "Observed an unexpected condition.",
          severity: "unknown",
          status: "open",
          expert_review_required: true,
          created_at: "2026-08-13T00:00:01.000Z",
        },
      ],
      error: null,
    });
    attachmentIn.mockImplementation((column: string) => {
      if (column === "action_log_id") {
        return Promise.resolve({
          data: [
            {
              id: "66666666-6666-4666-8666-666666666666",
              action_log_id: "55555555-5555-4555-8555-555555555555",
              issue_record_id: null,
              storage_path: "farm/action-log/action-photo.png",
              mime_type: "image/png",
              file_size_bytes: 8,
              captured_at: null,
              created_at: "2026-08-13T00:00:02.000Z",
            },
          ],
          error: null,
        });
      }
      return Promise.resolve({ data: [], error: null });
    });
    createSignedUrl.mockResolvedValue({ data: { signedUrl: "https://example.test/action-photo.png" }, error: null });
    requireAuthenticatedUser.mockResolvedValue({
      ok: true,
      supabase: { from, storage: { from: storageFrom } },
      userId: "test-user-id",
    } as never);
  });

  it("returns ActionLog, IssueRecord, and Follow-up relationships in descending time order", async () => {
    const response = await GET(
      new Request(`http://localhost/api/farms/${farmId}/history`),
      { params: Promise.resolve({ farmId }) },
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      meta: { count: 3 },
      items: [
        { kind: "follow_up_task", parentIssueId: "44444444-4444-4444-8444-444444444444" },
        {
          kind: "issue",
          actionLogId: "55555555-5555-4555-8555-555555555555",
          observedSymptom: "Observed an unexpected condition.",
        },
        {
          kind: "action_log",
          actionType: "issue_reported",
          attachments: [{ mimeType: "image/png", signedUrl: "https://example.test/action-photo.png" }],
        },
      ],
    });
  });
});
