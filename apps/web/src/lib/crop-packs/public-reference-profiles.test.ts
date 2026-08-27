import { describe, expect, it } from "vitest";

import { getPublicReferenceCropProfile, listPublicReferenceCropProfiles } from "@/lib/crop-packs/public-reference-profiles";

describe("public reference Crop Pack profiles", () => {
  it("maps an internal crop code to official public-information providers without Core branching", () => {
    expect(getPublicReferenceCropProfile(" Strawberry ")).toEqual({
      cropCode: "strawberry",
      kamisMarketReference: {
        categoryCode: "400",
        grade: "상품",
        itemName: "딸기",
      },
      nongsaroCropName: "딸기",
      verificationStatus: "evidence_checked",
    });
  });

  it("does not guess a provider mapping for an unregistered Crop Pack", () => {
    expect(getPublicReferenceCropProfile("test_crop")).toBeNull();
    expect(listPublicReferenceCropProfiles()).toHaveLength(1);
  });
});
