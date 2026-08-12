import { describe, expect, it } from "vitest";

import { parseCropCycleInput, parseFarmInput } from "@/lib/api/validation";

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
