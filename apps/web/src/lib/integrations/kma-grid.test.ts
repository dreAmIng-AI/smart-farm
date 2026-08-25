import { describe, expect, it } from "vitest";

import { toKmaForecastGrid } from "@/lib/integrations/kma-grid";

describe("KMA forecast-grid conversion", () => {
  it("converts Seoul City Hall coordinates to the published forecast grid", () => {
    expect(toKmaForecastGrid(37.5665, 126.978)).toEqual({ x: 60, y: 127 });
  });

  it("rejects coordinates outside the Korean forecast coverage", () => {
    expect(toKmaForecastGrid(51.5072, -0.1276)).toBeNull();
  });
});
