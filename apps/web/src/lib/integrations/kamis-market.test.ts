import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fetchKamisNationalWholesaleReference,
  getKamisMarketFailureDetails,
} from "@/lib/integrations/kamis-market";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("KAMIS market adapter", () => {
  it("normalizes the latest nationwide wholesale price without exposing the provider response", async () => {
    vi.stubEnv("KAMIS_CERT_KEY", "test-key");
    vi.stubEnv("KAMIS_CERT_ID", "test-requester");
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: {
        error_code: "000",
        item: [
          { item_name: "토마토", kind_name: "토마토", rank: "상품", unit: "10kg", day1: "20260827", dpr1: "20,000" },
          { item_name: "딸기", kind_name: "설향", rank: "중품", unit: "2kg", day1: "20260827", dpr1: "16,000" },
          { item_name: "딸기", kind_name: "설향", rank: "상품", unit: "2kg", day1: "20260827", dpr1: "20,000", day2: "20260826", dpr2: "18,000" },
        ],
      },
    }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchKamisNationalWholesaleReference({
      categoryCode: "400",
      grade: "상품",
      itemName: "딸기",
      now: new Date("2026-08-27T01:00:00.000Z"),
    })).resolves.toEqual({
      baseDate: "2026-08-26T15:00:00.000Z",
      grade: "상품",
      itemName: "딸기",
      kindName: "설향",
      marketName: "전체지역",
      previousPriceWon: 18000,
      priceWon: 20000,
      unit: "2kg",
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("p_product_cls_code=02");
    expect(String(fetchMock.mock.calls[0][0])).toContain("p_item_category_code=400");
    expect(String(fetchMock.mock.calls[0][0])).toContain("p_regday=2026-08-27");
    expect(String(fetchMock.mock.calls[0][0])).not.toContain("p_country_code=");
  });

  it("fails safely when no exact Crop Pack-mapped item is returned", async () => {
    vi.stubEnv("KAMIS_CERT_KEY", "test-key");
    vi.stubEnv("KAMIS_CERT_ID", "test-requester");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { error_code: "000", item: [{ item_name: "토마토", rank: "상품", unit: "10kg", day1: "20260827", dpr1: "20,000" }] },
    }), { status: 200 })));

    await expect(fetchKamisNationalWholesaleReference({ categoryCode: "400", grade: "상품", itemName: "딸기" })).rejects.toThrow("KAMIS_ITEM_NOT_FOUND");
  });

  it("requires server-only KAMIS credentials", async () => {
    await expect(fetchKamisNationalWholesaleReference({ categoryCode: "400", grade: "상품", itemName: "딸기" })).rejects.toThrow("KAMIS_CERT_ID_NOT_CONFIGURED");
  });

  it("classifies an official provider error code without retaining the provider response body", async () => {
    vi.stubEnv("KAMIS_CERT_KEY", "test-key");
    vi.stubEnv("KAMIS_CERT_ID", "test-requester");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      data: { error_code: "901" },
    }), { status: 200 })));

    const error = await fetchKamisNationalWholesaleReference({
      categoryCode: "400",
      grade: "상품",
      itemName: "딸기",
    }).catch((reason) => reason);

    expect(getKamisMarketFailureDetails(error)).toEqual({
      code: "KAMIS_RESPONSE_ERROR",
      providerErrorCode: "901",
    });
  });

  it("classifies a provider HTTP failure without exposing its response body", async () => {
    vi.stubEnv("KAMIS_CERT_KEY", "test-key");
    vi.stubEnv("KAMIS_CERT_ID", "test-requester");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    const error = await fetchKamisNationalWholesaleReference({
      categoryCode: "400",
      grade: "상품",
      itemName: "딸기",
    }).catch((reason) => reason);

    expect(getKamisMarketFailureDetails(error)).toEqual({
      code: "KAMIS_REQUEST_FAILED",
      httpStatus: 403,
    });
  });

  it("classifies a network timeout without retaining its runtime error message", () => {
    const timeout = new Error("provider request timed out");
    timeout.name = "TimeoutError";

    expect(getKamisMarketFailureDetails(timeout)).toEqual({ code: "KAMIS_TIMEOUT" });
  });
});
