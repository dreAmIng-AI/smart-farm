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
  it("uses a provider crop name to resolve and normalize crop-specific disease/pest reference links", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(xml("<item><mainCategoryCode>VC</mainCategoryCode></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><middleCategoryCode>VC05</middleCategoryCode></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><subCategoryCode>VC051304</subCategoryCode><subCategoryNm>딸기</subCategoryNm></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><mainTechCode>GC</mainTechCode><mainTechNm>병해충(질병)</mainTechNm></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><subTechCode>GC01</subTechCode><subTechNm>병해충</subTechNm></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><techNm>딸기 병해충 관리 참고자료</techNm><regDt>20260814</regDt><fileDownUrl>http://www.nongsaro.go.kr/cms_contents/example.pdf</fileDownUrl></item>"), { status: 200 })),
    );

    await expect(fetchNongsaroCropReference("딸기")).resolves.toEqual({
      officialCropName: "딸기",
      items: [{
        title: "딸기 병해충 관리 참고자료",
        publishedAt: "2026-08-13T15:00:00.000Z",
        referenceUrl: "https://www.nongsaro.go.kr/cms_contents/example.pdf",
      }],
    });
  });

  it("does not return unrelated material when the provider cannot exactly match the Crop Pack name", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn()
      .mockResolvedValueOnce(new Response(xml("<item><mainCategoryCode>VC</mainCategoryCode></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><middleCategoryCode>VC05</middleCategoryCode></item>"), { status: 200 }))
      .mockResolvedValueOnce(new Response(xml("<item><subCategoryCode>VC051304</subCategoryCode><subCategoryNm>토마토</subCategoryNm></item>"), { status: 200 })),
    );

    await expect(fetchNongsaroCropReference("딸기")).rejects.toThrow("NONGSARO_CROP_NOT_FOUND");
  });
});
