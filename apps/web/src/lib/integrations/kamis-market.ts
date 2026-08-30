const KAMIS_DAILY_PRICE_ENDPOINT = "https://www.kamis.or.kr/service/price/xml.do";
const KAMIS_MAX_LOOKBACK_DAYS = 7;

export const KAMIS_MARKET_SOURCE = {
  provider: "KAMIS",
  sourceName: "농산물유통정보(KAMIS) 가격정보",
  sourceReference: "https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=1",
} as const;

export type KamisMarketReferenceInput = {
  categoryCode: string;
  grade: string;
  itemName: string;
  now?: Date;
};

export type MarketReferenceData = {
  baseDate: string;
  grade: string;
  itemName: string;
  kindName: string | null;
  marketName: "전체지역";
  previousPriceWon: number | null;
  priceWon: number;
  unit: string;
};

const KAMIS_FAILURE_CODES = [
  "KAMIS_CERT_ID_NOT_CONFIGURED",
  "KAMIS_CERT_KEY_NOT_CONFIGURED",
  "KAMIS_EMPTY_RESPONSE",
  "KAMIS_ITEM_NOT_FOUND",
  "KAMIS_MALFORMED_RESPONSE",
  "KAMIS_NETWORK_FAILED",
  "KAMIS_REQUEST_FAILED",
  "KAMIS_RESPONSE_ERROR",
  "KAMIS_TIMEOUT",
  "KAMIS_UNKNOWN_ERROR",
] as const;

export type KamisMarketFailureCode = (typeof KAMIS_FAILURE_CODES)[number];

export type KamisMarketFailureDetails = {
  code: KamisMarketFailureCode;
  httpStatus?: number;
  providerErrorCode?: string;
};

class KamisMarketIntegrationError extends Error {
  readonly details: KamisMarketFailureDetails;

  constructor(code: KamisMarketFailureCode, details: Omit<KamisMarketFailureDetails, "code"> = {}) {
    super(code);
    this.name = "KamisMarketIntegrationError";
    this.details = { code, ...details };
  }
}

type KamisItem = Record<string, unknown>;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function asText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalized(value: string) {
  return value.replaceAll(/\s+/g, "").trim();
}

function toPriceWon(value: unknown) {
  const text = asText(value).replaceAll(",", "").replaceAll("원", "");
  if (!/^\d+(?:\.\d+)?$/.test(text)) return null;
  const price = Number(text);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function toKstDate(value: unknown) {
  const digits = asText(value).replaceAll(/[^0-9]/g, "");
  if (!/^\d{8}$/.test(digits)) return null;

  const date = new Date(`${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}T00:00:00+09:00`);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function kstDate(now: Date) {
  const shifted = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return shifted.toISOString().slice(0, 10);
}

function kstDateAtLookback(now: Date, lookbackDays: number) {
  return kstDate(new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000));
}

function safeProviderErrorCode(value: unknown) {
  const code = asText(value);
  return /^[A-Za-z0-9_-]{1,32}$/.test(code) ? code : undefined;
}

function responseItems(payload: unknown): KamisItem[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const errorCode = asText(data?.error_code ?? root?.error_code);
  if (errorCode && errorCode !== "000") {
    throw new KamisMarketIntegrationError("KAMIS_RESPONSE_ERROR", {
      providerErrorCode: safeProviderErrorCode(errorCode),
    });
  }

  const rawItems = data?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const records = items.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
  if (records.length === 0) throw new KamisMarketIntegrationError("KAMIS_EMPTY_RESPONSE");
  return records;
}

function pricePoint(item: KamisItem) {
  for (let dayIndex = 1; dayIndex <= 10; dayIndex += 1) {
    const priceWon = toPriceWon(item[`dpr${dayIndex}`]);
    const baseDate = toKstDate(item[`day${dayIndex}`]);
    if (priceWon !== null && baseDate) {
      let previousPriceWon: number | null = null;
      for (let previousIndex = dayIndex + 1; previousIndex <= 10; previousIndex += 1) {
        const value = toPriceWon(item[`dpr${previousIndex}`]);
        if (value !== null) {
          previousPriceWon = value;
          break;
        }
      }
      return { baseDate, previousPriceWon, priceWon };
    }
  }
  return null;
}

function selectedItem(items: KamisItem[], input: KamisMarketReferenceInput) {
  const matchedItems = items.filter((item) => normalized(asText(item.item_name)) === normalized(input.itemName));
  const preferredGrade = matchedItems.find((item) => asText(item.rank) === input.grade && pricePoint(item));
  const fallback = matchedItems.find((item) => pricePoint(item));
  return preferredGrade ?? fallback ?? null;
}

function requiredCredential(name: "key" | "requesterId") {
  const value = name === "key" ? process.env.KAMIS_CERT_KEY : process.env.KAMIS_CERT_ID;
  if (!value) {
    throw new KamisMarketIntegrationError(name === "key" ? "KAMIS_CERT_KEY_NOT_CONFIGURED" : "KAMIS_CERT_ID_NOT_CONFIGURED");
  }
  return value;
}

function isKamisMarketFailureCode(value: string): value is KamisMarketFailureCode {
  return (KAMIS_FAILURE_CODES as readonly string[]).includes(value);
}

export function getKamisMarketFailureDetails(error: unknown): KamisMarketFailureDetails {
  if (error instanceof KamisMarketIntegrationError) return error.details;

  if (error instanceof Error) {
    if (isKamisMarketFailureCode(error.message)) return { code: error.message };
    if (error.name === "AbortError" || error.name === "TimeoutError") return { code: "KAMIS_TIMEOUT" };
    if (error instanceof TypeError) return { code: "KAMIS_NETWORK_FAILED" };
  }

  return { code: "KAMIS_UNKNOWN_ERROR" };
}

function requestUrl(input: KamisMarketReferenceInput, requestedDate: string) {
  const url = new URL(KAMIS_DAILY_PRICE_ENDPOINT);
  url.search = new URLSearchParams({
    action: "dailyPriceByCategoryList",
    p_cert_id: requiredCredential("requesterId"),
    p_cert_key: requiredCredential("key"),
    p_convert_kg_yn: "N",
    p_item_category_code: input.categoryCode,
    p_product_cls_code: "02",
    p_regday: requestedDate,
    p_returntype: "json",
  }).toString();
  return url;
}

async function requestMarketReference(input: KamisMarketReferenceInput, requestedDate: string): Promise<MarketReferenceData> {
  const url = requestUrl(input, requestedDate);

  let response: Response;
  try {
    response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  } catch (error) {
    const { code, ...details } = getKamisMarketFailureDetails(error);
    throw new KamisMarketIntegrationError(code, details);
  }
  if (!response.ok) {
    throw new KamisMarketIntegrationError("KAMIS_REQUEST_FAILED", { httpStatus: response.status });
  }

  const item = selectedItem(responseItems(await response.json().catch(() => null)), input);
  const point = item ? pricePoint(item) : null;
  if (!item || !point) throw new KamisMarketIntegrationError("KAMIS_ITEM_NOT_FOUND");

  const unit = asText(item.unit);
  if (!unit) throw new KamisMarketIntegrationError("KAMIS_MALFORMED_RESPONSE");

  return {
    itemName: asText(item.item_name) || input.itemName,
    kindName: asText(item.kind_name) || null,
    grade: asText(item.rank) || input.grade,
    unit,
    marketName: "전체지역",
    ...point,
  };
}

export async function fetchKamisNationalWholesaleReference(input: KamisMarketReferenceInput): Promise<MarketReferenceData> {
  const now = input.now ?? new Date();
  let lastEmptyResponse: unknown = null;

  // KAMIS can omit the category list on weekends and other non-market days.
  // Retry only that honest "no rows" condition; credential, provider and network failures must remain visible to operations.
  for (let lookbackDays = 0; lookbackDays < KAMIS_MAX_LOOKBACK_DAYS; lookbackDays += 1) {
    try {
      return await requestMarketReference(input, kstDateAtLookback(now, lookbackDays));
    } catch (error) {
      if (getKamisMarketFailureDetails(error).code !== "KAMIS_EMPTY_RESPONSE") throw error;
      lastEmptyResponse = error;
    }
  }

  throw lastEmptyResponse;
}
