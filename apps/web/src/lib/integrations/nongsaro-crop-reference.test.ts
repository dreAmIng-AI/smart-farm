import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchNongsaroCropReference } from "@/lib/integrations/nongsaro-crop-reference";

function xml(items: string) {
  return `<response><header><resultCode>00</resultCode></header><body><items>${items}</items></body></response>`;
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Nongsaro crop-reference adapter", () => {
  const strawberryReference = {
    mainCategoryCode: "VC",
    middleCategoryCode: "VC01",
    subCategoryCode: "VC010804",
    diseasePestMainTechCode: "GP",
    diseasePestSubTechCodes: ["GP01", "GP02"],
  };

  it("uses Crop Pack provider codes to normalize crop-specific disease/pest reference links", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(xml("<item><techNm>딸기 병해충 관리 참고자료</techNm><regDt>20260814</regDt><fileDownUrl>http://www.nongsaro.go.kr/cms_contents/example.pdf</fileDownUrl></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml(""), { status: 200 })),
    );

    await expect(fetchNongsaroCropReference("딸기", strawberryReference)).resolves.toEqual({
      officialCropName: "딸기",
      items: [{
        title: "딸기 병해충 관리 참고자료",
        publishedAt: "2026-08-13T15:00:00.000Z",
        referenceUrl: "https://www.nongsaro.go.kr/cms_contents/example.pdf",
      }],
    });
  });

  it("does not make a provider request when a Crop Pack has no disease/pest subcategory", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNongsaroCropReference("딸기", { ...strawberryReference, diseasePestSubTechCodes: [] }))
      .rejects.toThrow("NONGSARO_DISEASE_PEST_CATEGORY_NOT_FOUND");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
