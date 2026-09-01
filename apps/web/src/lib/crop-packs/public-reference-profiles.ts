export type PublicReferenceCropProfile = {
  cropCode: string;
  kamisMarketReference?: {
    categoryCode: string;
    grade: string;
    itemName: string;
  };
  nongsaroCropTechReference?: {
    mainCategoryCode: string;
    middleCategoryCode: string;
    subCategoryCode: string;
    diseasePestMainTechCode: string;
    diseasePestSubTechCodes: string[];
  };
  nongsaroCropName: string;
  verificationStatus: "evidence_checked";
};

const publicReferenceCropProfiles: PublicReferenceCropProfile[] = [
  {
    cropCode: "strawberry",
    kamisMarketReference: {
      categoryCode: "400",
      grade: "상품",
      itemName: "딸기",
    },
    nongsaroCropName: "딸기",
    // 농사로 작목기술 서비스의 채소 > 과채류 > 딸기 > 병해충(질병) 분류.
    // Provider 분류값은 Core 로직이 아닌 Crop Pack에서만 관리한다.
    nongsaroCropTechReference: {
      mainCategoryCode: "VC",
      middleCategoryCode: "VC01",
      subCategoryCode: "VC010804",
      diseasePestMainTechCode: "GP",
      diseasePestSubTechCodes: ["GP01", "GP02"],
    },
    verificationStatus: "evidence_checked",
  },
];

function normalizedCropCode(value: string) {
  return value.trim().toLocaleLowerCase("en-US");
}

export function getPublicReferenceCropProfile(cropCode: string) {
  const normalized = normalizedCropCode(cropCode);
  return publicReferenceCropProfiles.find((profile) => normalizedCropCode(profile.cropCode) === normalized) ?? null;
}

export function listPublicReferenceCropProfiles() {
  return [...publicReferenceCropProfiles];
}
