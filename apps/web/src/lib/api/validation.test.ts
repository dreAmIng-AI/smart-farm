import { describe, expect, it } from "vitest";

import { parseActionLogInput, parseCropCycleInput, parseFarmInput } from "@/lib/api/validation";

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

  it("rejects problem reporting until the IssueRecord Slice", () => {
    expect(parseActionLogInput({ actionType: "issue_reported" })).toMatchObject({
      ok: false,
      error: "actionType must be completed or not_checked.",
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
