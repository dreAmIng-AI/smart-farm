import { describe, expect, it } from "vitest";

import {
  KMA_MUNICIPALITY_FORECAST_REGIONS,
  searchKmaMunicipalityForecastRegions,
} from "@/lib/integrations/kma-municipality-forecast-regions";

describe("KMA municipality forecast regions", () => {
  it("includes the official representative KMA forecast grid for 김제시", () => {
    expect(searchKmaMunicipalityForecastRegions("김제시")).toContainEqual({
      label: "전북특별자치도 김제시",
      province: "전북특별자치도",
      municipality: "김제시",
      gridX: 59,
      gridY: 88,
    });
  });

  it("finds a region when its province and municipality are separated by spaces", () => {
    expect(searchKmaMunicipalityForecastRegions("전북 김제")).toContainEqual(
      expect.objectContaining({ label: "전북특별자치도 김제시" }),
    );
  });

  it("returns no accidental all-region list for an empty query and caps search results", () => {
    expect(searchKmaMunicipalityForecastRegions("")).toEqual([]);
    expect(searchKmaMunicipalityForecastRegions("구", 3)).toHaveLength(3);
  });

  it("keeps one city, county, or district representative entry per official label", () => {
    expect(KMA_MUNICIPALITY_FORECAST_REGIONS).toHaveLength(256);
    expect(new Set(KMA_MUNICIPALITY_FORECAST_REGIONS.map((region) => region.label)).size).toBe(
      KMA_MUNICIPALITY_FORECAST_REGIONS.length,
    );
  });
});
