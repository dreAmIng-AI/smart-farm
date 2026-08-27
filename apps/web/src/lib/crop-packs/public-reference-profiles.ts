export type PublicReferenceCropProfile = {
  cropCode: string;
  nongsaroCropName: string;
  verificationStatus: "evidence_checked";
};

const publicReferenceCropProfiles: PublicReferenceCropProfile[] = [
  {
    cropCode: "strawberry",
    nongsaroCropName: "딸기",
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
