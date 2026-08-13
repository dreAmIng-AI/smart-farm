import { describe, expect, it } from "vitest";

import {
  parseAttachmentFile,
  parseActionLogInput,
  parseCropCycleGrowthStageInput,
  parseCropCycleInput,
  parseFarmInput,
  parseFollowUpTaskInput,
  parseIssueStatusInput,
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

describe("CropCycle input", () => {
  it("accepts a CropCycle with a valid transplant date", () => {
    expect(
      parseCropCycleInput({
        cropCode: "test_crop",
        cultivar: "test_variety",
        transplantDate: "2026-08-12",
      }),
    ).toMatchObject({ ok: true });
  });

  it("rejects invalid CropCycle input", () => {
    expect(
      parseCropCycleInput({ cropCode: "test_crop", transplantDate: "2026-02-30" }),
    ).toMatchObject({
      ok: false,
      error: "transplantDate must be a valid YYYY-MM-DD date.",
    });
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
