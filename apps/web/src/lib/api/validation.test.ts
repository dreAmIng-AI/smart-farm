import { describe, expect, it } from "vitest";

import {
  parseActionLogInput,
  parseCropCycleInput,
  parseFarmInput,
  parseFollowUpTaskInput,
} from "@/lib/api/validation";

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
