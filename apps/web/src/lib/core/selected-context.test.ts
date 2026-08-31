import { describe, expect, it } from "vitest";

import { parseSelectedContext, selectedContextStorageKey } from "@/lib/core/selected-context";

describe("selected context", () => {
  it("uses a per-user storage key", () => {
    expect(selectedContextStorageKey("user-a")).toBe("dreaming-smart-farm:selected-context:user-a");
  });

  it("accepts a farm context with or without a selected cultivation", () => {
    expect(parseSelectedContext('{"farmId":"farm-a","cropCycleId":"cycle-a"}')).toEqual({
      farmId: "farm-a",
      cropCycleId: "cycle-a",
    });
    expect(parseSelectedContext('{"farmId":"farm-a","cropCycleId":null}')).toEqual({
      farmId: "farm-a",
      cropCycleId: null,
    });
  });

  it("rejects invalid or incomplete stored data", () => {
    expect(parseSelectedContext(null)).toBeNull();
    expect(parseSelectedContext("not json")).toBeNull();
    expect(parseSelectedContext('{"cropCycleId":"cycle-a"}')).toBeNull();
    expect(parseSelectedContext('{"farmId":"farm-a","cropCycleId":4}')).toBeNull();
  });
});
