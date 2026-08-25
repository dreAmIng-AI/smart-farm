import { afterEach, describe, expect, it, vi } from "vitest";

import { fetchKmaWeather } from "@/lib/integrations/kma-weather";

const actualItems = [
  { baseDate: "20260825", baseTime: "0900", category: "T1H", obsrValue: "27.3" },
  { baseDate: "20260825", baseTime: "0900", category: "REH", obsrValue: "68" },
  { baseDate: "20260825", baseTime: "0900", category: "WSD", obsrValue: "1.4" },
];

const forecastItems = [
  { fcstDate: "20260825", fcstTime: "1000", category: "TMP", fcstValue: "28" },
  { fcstDate: "20260825", fcstTime: "1200", category: "TMX", fcstValue: "31" },
  { fcstDate: "20260825", fcstTime: "0600", category: "TMN", fcstValue: "22" },
  { fcstDate: "20260825", fcstTime: "1300", category: "POP", fcstValue: "60" },
  { fcstDate: "20260825", fcstTime: "1300", category: "PCP", fcstValue: "1mm 미만" },
];

function response(items: unknown[]) {
  return new Response(JSON.stringify({ response: { header: { resultCode: "00" }, body: { items: { item: items } } } }), { status: 200 });
}

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("KMA weather adapter", () => {
  it("normalizes current observations and today's short forecast without exposing provider payloads", async () => {
    vi.stubEnv("KMA_API_KEY", "test-key");
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(response(actualItems))
      .mockResolvedValueOnce(response(forecastItems));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchKmaWeather({ gridX: 60, gridY: 127, locationLabel: "서울 예보 위치", now: new Date("2026-08-25T01:20:00.000Z") })).resolves.toMatchObject({
      locationLabel: "서울 예보 위치",
      temperatureC: 27.3,
      humidityPercent: 68,
      windSpeedMps: 1.4,
      precipitationProbabilityPercent: 60,
      precipitationAmount: "1mm 미만",
      lowTemperatureC: 22,
      highTemperatureC: 31,
    });
    expect(String(fetchMock.mock.calls[0][0])).toContain("getUltraSrtNcst");
    expect(String(fetchMock.mock.calls[1][0])).toContain("getVilageFcst");
  });

  it("fails safely when KMA reports an error payload", async () => {
    vi.stubEnv("KMA_API_KEY", "test-key");
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ response: { header: { resultCode: "30" } } }), { status: 200 })));

    await expect(fetchKmaWeather({ gridX: 60, gridY: 127, locationLabel: "서울 예보 위치" })).rejects.toThrow("KMA_RESPONSE_ERROR");
  });
});
