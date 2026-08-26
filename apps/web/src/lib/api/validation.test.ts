import { describe, expect, it } from "vitest";

import {
  parseAttachmentFile,
  parseActionLogInput,
  parseCropCycleGrowthStageInput,
  parseCropCycleInput,
  parseCropCycleStatusInput,
  parseFarmTaskStatusInput,
  parseFarmInvitationAcceptanceInput,
  parseFarmInvitationInput,
  parseFarmMemberRoleInput,
  parseFarmTaskAssigneeInput,
  parseFarmWeatherLocationInput,
  parseFarmInput,
  parseFarmAreaInput,
  parseFollowUpTaskInput,
  parseIssueStatusInput,
  parseManualFarmTaskInput,
  parseMeasurementInput,
  parseObservationInput,
  parseObservationIssueInput,
} from "@/lib/api/validation";

const validPng = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe("Farm input", () => {
  it("accepts required Farm information", () => {
    expect(
      parseFarmInput({
        name: "Demo Farm",
        regionCode: "KR-DEMO",
        cultivationEnvironment: "facility",
        cultivationMethod: "protected_cultivation",
      }),
    ).toEqual({
      ok: true,
      data: {
        name: "Demo Farm",
        regionCode: "KR-DEMO",
        cultivationEnvironment: "facility",
        cultivationMethod: "protected_cultivation",
      },
    });
  });

  it("rejects missing required Farm information", () => {
    expect(
      parseFarmInput({
        name: "",
        regionCode: "",
        cultivationEnvironment: "facility",
      }),
    ).toMatchObject({ ok: false, error: "name and regionCode are required." });
  });
});

describe("FarmArea input", () => {
  it("accepts a named field area with an optional note", () => {
    expect(parseFarmAreaInput({ name: "1동", description: "시설 재배 구역" })).toEqual({
      ok: true,
      data: { name: "1동", description: "시설 재배 구역" },
    });
  });

  it("rejects an empty or oversized area name", () => {
    expect(parseFarmAreaInput({ name: "" })).toMatchObject({
      ok: false,
      error: "name is required and must not exceed 100 characters.",
    });
    expect(parseFarmAreaInput({ name: "a".repeat(101) })).toMatchObject({
      ok: false,
      error: "name is required and must not exceed 100 characters.",
    });
  });
});

describe("Observation input", () => {
  it("accepts a standalone fact with optional FarmArea and CropCycle context", () => {
    expect(
      parseObservationInput({
        content: "잎에서 갈색 반점이 보임",
        cropCycleId: null,
        farmAreaId: null,
        observedAt: "2026-08-24T01:00:00.000Z",
      }),
    ).toEqual({
      ok: true,
      data: {
        content: "잎에서 갈색 반점이 보임",
        cropCycleId: null,
        farmAreaId: null,
        observedAt: "2026-08-24T01:00:00.000Z",
      },
    });
  });

  it("rejects an Observation without a fact or valid observed time", () => {
    expect(parseObservationInput({ content: "", observedAt: "today" })).toMatchObject({ ok: false });
  });
});

describe("Observation issue input", () => {
  it("accepts a generic severity and optional expert-review request", () => {
    expect(parseObservationIssueInput({ severity: "high", expertReviewRequired: true })).toEqual({
      ok: true,
      data: { severity: "high", expertReviewRequired: true },
    });
  });

  it("rejects an unsupported severity", () => {
    expect(parseObservationIssueInput({ severity: "diagnosed", expertReviewRequired: false })).toMatchObject({
      ok: false,
      error: "severity must be low, medium, high, or unknown.",
    });
  });
});

describe("Measurement input", () => {
  it("accepts a standalone manual numeric record", () => {
    expect(
      parseMeasurementInput({
        metricCode: "manual_temperature",
        valueNumeric: 28.5,
        unit: "celsius",
        note: null,
        farmAreaId: null,
        cropCycleId: null,
        observedAt: "2026-08-24T01:00:00.000Z",
      }),
    ).toMatchObject({ ok: true, data: { valueNumeric: 28.5 } });
  });

  it("rejects a non-numeric measurement", () => {
    expect(parseMeasurementInput({ metricCode: "manual_temperature", valueNumeric: "28", unit: "celsius" })).toMatchObject({ ok: false });
  });
});

describe("Farm weather-location input", () => {
  it("accepts a user-confirmed location label and KMA forecast grid", () => {
    expect(parseFarmWeatherLocationInput({ label: "김제시 백구면", gridX: 56, gridY: 92 })).toEqual({
      ok: true,
      data: { label: "김제시 백구면", gridX: 56, gridY: 92 },
    });
  });

  it("rejects a missing label or invalid grid", () => {
    expect(parseFarmWeatherLocationInput({ label: "", gridX: 0, gridY: 254 })).toMatchObject({ ok: false });
  });
});

describe("Farm invitation input", () => {
  it("normalizes a valid invitation email and accepts a collaboration role", () => {
    expect(parseFarmInvitationInput({ email: "FARMER@example.com", role: "farmer" })).toEqual({
      ok: true,
      data: { email: "farmer@example.com", role: "farmer" },
    });
  });

  it("rejects an invalid invitation email or owner invitation", () => {
    expect(parseFarmInvitationInput({ email: "farmer", role: "farmer" })).toMatchObject({
      ok: false,
      error: "email must be a valid email address.",
    });
    expect(parseFarmInvitationInput({ email: "farmer@example.com", role: "owner" })).toMatchObject({
      ok: false,
      error: "role must be admin or farmer.",
    });
  });

  it("validates a role update and an invitation UUID token", () => {
    expect(parseFarmMemberRoleInput({ role: "admin" })).toEqual({ ok: true, data: { role: "admin" } });
    expect(
      parseFarmInvitationAcceptanceInput({ token: "11111111-1111-4111-8111-111111111111" }),
    ).toEqual({ ok: true, data: { token: "11111111-1111-4111-8111-111111111111" } });
    expect(parseFarmInvitationAcceptanceInput({ token: "invalid" })).toMatchObject({
      ok: false,
      error: "token must be a UUID.",
    });
  });
});

describe("CropCycle input", () => {
  it("accepts a CropCycle with a valid transplant date", () => {
    expect(
      parseCropCycleInput({
        cropCode: "test_crop",
        cultivar: "test_variety",
        farmAreaId: "11111111-1111-4111-8111-111111111111",
        transplantDate: "2026-08-12",
      }),
    ).toEqual({
      ok: true,
      data: {
        cropCode: "test_crop",
        cultivar: "test_variety",
        farmAreaId: "11111111-1111-4111-8111-111111111111",
        transplantDate: "2026-08-12",
        growthStage: null,
      },
    });
  });

  it("rejects invalid CropCycle input", () => {
    expect(
      parseCropCycleInput({ cropCode: "test_crop", transplantDate: "2026-02-30" }),
    ).toMatchObject({
      ok: false,
      error: "transplantDate must be a valid YYYY-MM-DD date.",
    });
    expect(
      parseCropCycleInput({ cropCode: "test_crop", farmAreaId: "not-a-uuid", transplantDate: "2026-08-12" }),
    ).toMatchObject({ ok: false, error: "farmAreaId must be a UUID or null." });
  });
});

describe("CropCycle growth stage input", () => {
  it("accepts a generic Crop Pack stage and allows clearing it", () => {
    expect(parseCropCycleGrowthStageInput({ growthStage: "flowering" })).toEqual({
      ok: true,
      data: { growthStage: "flowering" },
    });
    expect(parseCropCycleGrowthStageInput({ growthStage: "" })).toEqual({
      ok: true,
      data: { growthStage: null },
    });
  });

  it("rejects a missing or oversized growth stage", () => {
    expect(parseCropCycleGrowthStageInput({})).toMatchObject({
      ok: false,
      error: "growthStage is required.",
    });
    expect(parseCropCycleGrowthStageInput({ growthStage: "a".repeat(101) })).toMatchObject({
      ok: false,
      error: "growthStage must not exceed 100 characters.",
    });
  });
});

describe("CropCycle terminal status input", () => {
  it("accepts completed and cancelled terminal statuses", () => {
    expect(parseCropCycleStatusInput({ status: "completed" })).toEqual({
      ok: true,
      data: { status: "completed" },
    });
    expect(parseCropCycleStatusInput({ status: "cancelled" })).toEqual({
      ok: true,
      data: { status: "cancelled" },
    });
  });

  it("rejects reopening or an unsupported status", () => {
    expect(parseCropCycleStatusInput({ status: "active" })).toMatchObject({
      ok: false,
      error: "status must be completed or cancelled.",
    });
  });
});

describe("FarmTask cancellation input", () => {
  it("accepts cancellation as the only supported FarmTask status update", () => {
    expect(parseFarmTaskStatusInput({ status: "cancelled" })).toEqual({
      ok: true,
      data: { status: "cancelled" },
    });
  });

  it("rejects a non-cancellation task status update", () => {
    expect(parseFarmTaskStatusInput({ status: "completed" })).toMatchObject({
      ok: false,
      error: "status must be cancelled.",
    });
  });
});

describe("FarmTask assignee input", () => {
  it("accepts a Farm member UUID or an explicit unassignment", () => {
    expect(
      parseFarmTaskAssigneeInput({ assignedUserId: "11111111-1111-4111-8111-111111111111" }),
    ).toEqual({
      ok: true,
      data: { assignedUserId: "11111111-1111-4111-8111-111111111111" },
    });
    expect(parseFarmTaskAssigneeInput({ assignedUserId: null })).toEqual({
      ok: true,
      data: { assignedUserId: null },
    });
  });

  it("rejects an omitted or malformed assignee", () => {
    expect(parseFarmTaskAssigneeInput({})).toMatchObject({
      ok: false,
      error: "assignedUserId is required.",
    });
    expect(parseFarmTaskAssigneeInput({ assignedUserId: "not-a-uuid" })).toMatchObject({
      ok: false,
      error: "assignedUserId must be a UUID or null.",
    });
  });
});

describe("Issue status input", () => {
  it("accepts the existing generic IssueRecord statuses", () => {
    expect(parseIssueStatusInput({ status: "needs_review" })).toEqual({
      ok: true,
      data: { status: "needs_review" },
    });
    expect(parseIssueStatusInput({ status: "closed_without_action" })).toEqual({
      ok: true,
      data: { status: "closed_without_action" },
    });
  });

  it("rejects an unsupported IssueRecord status", () => {
    expect(parseIssueStatusInput({ status: "diagnosed" })).toMatchObject({
      ok: false,
      error: "status must be open, needs_review, resolved, or closed_without_action.",
    });
  });
});

describe("ActionLog input", () => {
  it("accepts a work start with an optional note", () => {
    expect(
      parseActionLogInput({
        actionType: "started",
        note: "현장 작업을 시작합니다.",
        performedAt: "2026-08-12T01:15:00.000Z",
      }),
    ).toEqual({
      ok: true,
      data: {
        actionType: "started",
        note: "현장 작업을 시작합니다.",
        performedAt: "2026-08-12T01:15:00.000Z",
      },
    });
  });

  it("accepts a completed result with a short note", () => {
    expect(
      parseActionLogInput({
        actionType: "completed",
        note: "작업을 완료했습니다.",
        performedAt: "2026-08-12T01:15:00.000Z",
      }),
    ).toEqual({
      ok: true,
      data: {
        actionType: "completed",
        note: "작업을 완료했습니다.",
        performedAt: "2026-08-12T01:15:00.000Z",
      },
    });
  });

  it("accepts a problem report with an observed fact", () => {
    expect(
      parseActionLogInput({
        actionType: "issue_reported",
        note: "Checked during the planned work.",
        issue: {
          observedSymptom: "Observed an unexpected condition.",
          severity: "unknown",
          expertReviewRequired: false,
        },
      }),
    ).toMatchObject({
      ok: true,
      data: { actionType: "issue_reported", issue: { severity: "unknown" } },
    });
  });

  it("rejects a problem report without an observed fact", () => {
    expect(parseActionLogInput({ actionType: "issue_reported", issue: {} })).toMatchObject({
      ok: false,
      error: "issue.observedSymptom is required and must not exceed 1000 characters.",
    });
  });

  it("rejects a non-UTC performed timestamp", () => {
    expect(
      parseActionLogInput({
        actionType: "not_checked",
        performedAt: "2026-08-12T10:15:00+09:00",
      }),
    ).toMatchObject({
      ok: false,
      error: "performedAt must be an ISO 8601 UTC timestamp.",
    });
  });
});

describe("Follow-up FarmTask input", () => {
  it("accepts a generic follow-up without crop-specific input", () => {
    expect(
      parseFollowUpTaskInput({
        title: "Recheck observed issue",
        scheduledFor: "2026-08-14",
        priority: "medium",
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects an invalid follow-up date", () => {
    expect(
      parseFollowUpTaskInput({ title: "Recheck", scheduledFor: "2026-02-30", priority: "medium" }),
    ).toMatchObject({ ok: false, error: "scheduledFor must be a valid YYYY-MM-DD date." });
  });
});

describe("Manual FarmTask input", () => {
  it("accepts a direct task without crop-specific Core input", () => {
    expect(
      parseManualFarmTaskInput({
        title: "Check greenhouse ventilation",
        reason: "Operator-requested facility check.",
        farmAreaId: null,
        scheduledFor: "2026-08-14",
        priority: "medium",
      }),
    ).toMatchObject({ ok: true });
  });

  it("requires a date and a meaningful reason", () => {
    expect(
      parseManualFarmTaskInput({ title: "Check", reason: "", scheduledFor: "2026-08-14", priority: "medium" }),
    ).toMatchObject({ ok: false, error: "reason is required and must not exceed 1000 characters." });
    expect(
      parseManualFarmTaskInput({ title: "Check", reason: "Reason", scheduledFor: "2026-02-30", priority: "medium" }),
    ).toMatchObject({ ok: false, error: "scheduledFor must be a valid YYYY-MM-DD date." });
    expect(
      parseManualFarmTaskInput({ title: "Check", reason: "Reason", farmAreaId: "not-a-uuid", scheduledFor: "2026-08-14", priority: "medium" }),
    ).toMatchObject({ ok: false, error: "farmAreaId must be a UUID or null." });
  });
});

describe("Attachment file input", () => {
  it("accepts a PNG image with a matching signature", async () => {
    await expect(parseAttachmentFile(new File([validPng], "field-photo.png", { type: "image/png" }))).resolves.toEqual({
      ok: true,
      data: { extension: "png", fileSizeBytes: 8, mimeType: "image/png" },
    });
  });

  it("rejects a file with a mismatched image signature", async () => {
    await expect(
      parseAttachmentFile(new File([new Uint8Array([1, 2, 3])], "not-an-image.png", { type: "image/png" })),
    ).resolves.toMatchObject({ ok: false, error: "file contents do not match its image type." });
  });

  it("rejects an unsupported file type", async () => {
    await expect(
      parseAttachmentFile(new File([validPng], "field-photo.gif", { type: "image/gif" })),
    ).resolves.toMatchObject({ ok: false, error: "file must be a JPEG, PNG, or WebP image." });
  });
});
