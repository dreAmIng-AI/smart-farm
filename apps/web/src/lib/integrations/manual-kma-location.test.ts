import { describe, expect, it } from "vitest";

import { manualKmaLocationToGrid } from "./manual-kma-location";

describe("manualKmaLocationToGrid", () => {
  it("converts one-time manual coordinates to a KMA grid", () => {
    expect(manualKmaLocationToGrid("37.5665", "126.9780")).toEqual({
      ok: true,
      grid: { x: 60, y: 127 },
    });
  });

  it("rejects blank, non-numeric and out-of-range coordinates", () => {
    expect(manualKmaLocationToGrid("", "126.9780")).toMatchObject({ ok: false });
    expect(manualKmaLocationToGrid("north", "east")).toMatchObject({ ok: false });
    expect(manualKmaLocationToGrid("51", "126.9780")).toMatchObject({ ok: false });
  });
});
