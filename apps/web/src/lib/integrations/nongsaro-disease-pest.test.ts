import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchNongsaroDiseasePest } from "@/lib/integrations/nongsaro-disease-pest";

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<response><header><resultCode>00</resultCode></header><body><items>
  <item><cntntsSj><![CDATA[병해충발생정보 제 11호]]></cntntsSj><registDt>2026-08-14</registDt><downFile>http://www.nongsaro.go.kr/cms_contents/example.pdf</downFile></item>
  <item><cntntsSj>병해충발생정보 제 10호</cntntsSj><registDt>20260805</registDt><downFile>https://example.test/untrusted.pdf</downFile></item>
</items></body></response>`;

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Nongsaro disease/pest adapter", () => {
  it("normalizes the official occurrence bulletin without returning raw XML", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue(new Response(xml, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchNongsaroDiseasePest()).resolves.toEqual({
      scope: "national_occurrence_bulletin",
      bulletins: [
        {
          title: "병해충발생정보 제 11호",
          publishedAt: "2026-08-13T15:00:00.000Z",
          attachmentUrl: "https://www.nongsaro.go.kr/cms_contents/example.pdf",
        },
        {
          title: "병해충발생정보 제 10호",
          publishedAt: "2026-08-04T15:00:00.000Z",
          attachmentUrl: null,
        },
      ],
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("dbyhsCccrrncInfoList");
  });

  it("fails safely when the provider reports an error payload", async () => {
    vi.stubEnv("NONGSARO_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<response><header><resultCode>11</resultCode></header></response>", { status: 200 })));

    await expect(fetchNongsaroDiseasePest()).rejects.toThrow("NONGSARO_RESPONSE_ERROR");
  });
});
