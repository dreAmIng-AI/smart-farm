const KMA_API_BASE_URL = "https://apihub.kma.go.kr/api/typ02/openApi/VilageFcstInfoService_2.0";
const KMA_CURRENT_ENDPOINT = "getUltraSrtNcst";
const KMA_FORECAST_ENDPOINT = "getVilageFcst";

export const KMA_WEATHER_SOURCE = {
  provider: "KMA",
  sourceName: "기상청 동네예보 격자자료",
  sourceReference: "https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286",
} as const;

export type WeatherData = {
  humidityPercent: number | null;
  locationLabel: string;
  lowTemperatureC: number | null;
  precipitationAmount: string | null;
  precipitationProbabilityPercent: number | null;
  temperatureC: number | null;
  observedAt: string | null;
  forecastPublishedAt: string | null;
  highTemperatureC: number | null;
  windSpeedMps: number | null;
};

type KmaItem = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function kstParts(now: Date) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const iso = shifted.toISOString();
  return { date: iso.slice(0, 10).replaceAll("-", ""), hour: Number(iso.slice(11, 13)), minute: Number(iso.slice(14, 16)) };
}

function kstDateTimeToIso(dateValue: unknown, timeValue: unknown): string | null {
  const date = typeof dateValue === "string" ? dateValue : "";
  const time = typeof timeValue === "string" ? timeValue.padStart(4, "0") : "";
  if (!/^\d{8}$/.test(date) || !/^\d{4}$/.test(time)) {
    return null;
  }

  const parsed = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T${time.slice(0, 2)}:${time.slice(2, 4)}:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function latestCurrentBase(now: Date) {
  const target = new Date(now.getTime() - 40 * 60 * 1000);
  const parts = kstParts(target);
  return { baseDate: parts.date, baseTime: `${String(parts.hour).padStart(2, "0")}${String(Math.floor(parts.minute / 10) * 10).padStart(2, "0")}` };
}

function latestForecastBase(now: Date) {
  const target = new Date(now.getTime() - 90 * 60 * 1000);
  const parts = kstParts(target);
  const hours = [23, 20, 17, 14, 11, 8, 5, 2];
  const selectedHour = hours.find((hour) => hour <= parts.hour);
  if (selectedHour !== undefined) {
    return { baseDate: parts.date, baseTime: `${String(selectedHour).padStart(2, "0")}00` };
  }

  const previous = new Date(target.getTime() - 24 * 60 * 60 * 1000);
  return { baseDate: kstParts(previous).date, baseTime: "2300" };
}

function readKmaItems(payload: unknown): KmaItem[] {
  const root = asRecord(payload);
  const response = asRecord(root?.response);
  const header = asRecord(response?.header);
  if (header?.resultCode !== "00") {
    throw new Error("KMA_RESPONSE_ERROR");
  }

  const body = asRecord(response?.body);
  const items = asRecord(body?.items);
  const rawItems = items?.item;
  if (!Array.isArray(rawItems)) {
    throw new Error("KMA_MALFORMED_RESPONSE");
  }

  return rawItems.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
}

async function requestKmaItems(
  endpoint: string,
  apiKey: string,
  params: Record<string, string>,
): Promise<KmaItem[]> {
  const url = new URL(`${KMA_API_BASE_URL}/${endpoint}`);
  url.search = new URLSearchParams({ dataType: "JSON", numOfRows: "1000", pageNo: "1", authKey: apiKey, ...params }).toString();
  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error("KMA_REQUEST_FAILED");
  }

  return readKmaItems(await response.json().catch(() => null));
}

function itemValue(items: KmaItem[], category: string, valueField: "obsrValue" | "fcstValue") {
  const item = items.find((candidate) => candidate.category === category);
  return toFiniteNumber(item?.[valueField]);
}

function forecastItemsForToday(items: KmaItem[], now: Date) {
  const { date } = kstParts(now);
  return items.filter((item) => item.fcstDate === date);
}

function firstTextForecastValue(items: KmaItem[], category: string): string | null {
  const item = items.find((candidate) => candidate.category === category && typeof candidate.fcstValue === "string");
  const value = typeof item?.fcstValue === "string" ? item.fcstValue.trim() : "";
  return value && value !== "강수없음" ? value : null;
}

function dailyTemperature(items: KmaItem[], category: "TMN" | "TMX" | "TMP", mode: "min" | "max") {
  const values = items
    .filter((item) => item.category === category)
    .map((item) => toFiniteNumber(item.fcstValue))
    .filter((value): value is number => value !== null);
  if (values.length === 0) return null;
  return mode === "min" ? Math.min(...values) : Math.max(...values);
}

function maxForecastValue(items: KmaItem[], category: string) {
  const values = items
    .filter((item) => item.category === category)
    .map((item) => toFiniteNumber(item.fcstValue))
    .filter((value): value is number => value !== null);
  return values.length > 0 ? Math.max(...values) : null;
}

function requiredApiKey(name: "forecast" | "observation") {
  const value = name === "forecast"
    ? process.env.KMA_FORECAST_API_KEY ?? process.env.KMA_API_KEY
    : process.env.KMA_OBSERVATION_API_KEY ?? process.env.KMA_API_KEY;
  if (!value) {
    throw new Error("KMA_API_KEY_NOT_CONFIGURED");
  }
  return value;
}

export async function fetchKmaWeather(input: { gridX: number; gridY: number; locationLabel: string; now?: Date }): Promise<WeatherData> {
  const now = input.now ?? new Date();
  const currentBase = latestCurrentBase(now);
  const forecastBase = latestForecastBase(now);
  const [currentItems, forecastItems] = await Promise.all([
    requestKmaItems(KMA_CURRENT_ENDPOINT, requiredApiKey("observation"), {
      base_date: currentBase.baseDate,
      base_time: currentBase.baseTime,
      nx: String(input.gridX),
      ny: String(input.gridY),
    }),
    requestKmaItems(KMA_FORECAST_ENDPOINT, requiredApiKey("forecast"), {
      base_date: forecastBase.baseDate,
      base_time: forecastBase.baseTime,
      nx: String(input.gridX),
      ny: String(input.gridY),
    }),
  ]);
  const todayForecastItems = forecastItemsForToday(forecastItems, now);
  const currentItem = currentItems[0];

  return {
    locationLabel: input.locationLabel,
    temperatureC: itemValue(currentItems, "T1H", "obsrValue") ?? itemValue(todayForecastItems, "TMP", "fcstValue"),
    humidityPercent: itemValue(currentItems, "REH", "obsrValue"),
    windSpeedMps: itemValue(currentItems, "WSD", "obsrValue"),
    precipitationProbabilityPercent: maxForecastValue(todayForecastItems, "POP"),
    precipitationAmount: firstTextForecastValue(todayForecastItems, "PCP"),
    lowTemperatureC: dailyTemperature(todayForecastItems, "TMN", "min") ?? dailyTemperature(todayForecastItems, "TMP", "min"),
    highTemperatureC: dailyTemperature(todayForecastItems, "TMX", "max") ?? dailyTemperature(todayForecastItems, "TMP", "max"),
    observedAt: currentItem ? kstDateTimeToIso(currentItem.baseDate, currentItem.baseTime) : null,
    forecastPublishedAt: kstDateTimeToIso(forecastBase.baseDate, forecastBase.baseTime),
  };
}
