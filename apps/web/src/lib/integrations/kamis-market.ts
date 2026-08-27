const KAMIS_DAILY_PRICE_ENDPOINT = "https://www.kamis.or.kr/service/price/xml.do";

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

function responseItems(payload: unknown): KamisItem[] {
  const root = asRecord(payload);
  const data = asRecord(root?.data);
  const errorCode = asText(data?.error_code ?? root?.error_code);
  if (errorCode && errorCode !== "000") throw new Error("KAMIS_RESPONSE_ERROR");

  const rawItems = data?.item;
  const items = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
  const records = items.flatMap((item) => {
    const record = asRecord(item);
    return record ? [record] : [];
  });
  if (records.length === 0) throw new Error("KAMIS_EMPTY_RESPONSE");
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
  if (!value) throw new Error(name === "key" ? "KAMIS_CERT_KEY_NOT_CONFIGURED" : "KAMIS_CERT_ID_NOT_CONFIGURED");
  return value;
}

export async function fetchKamisNationalWholesaleReference(input: KamisMarketReferenceInput): Promise<MarketReferenceData> {
  const url = new URL(KAMIS_DAILY_PRICE_ENDPOINT);
  url.search = new URLSearchParams({
    action: "dailyPriceByCategoryList",
    p_cert_id: requiredCredential("requesterId"),
    p_cert_key: requiredCredential("key"),
    p_convert_kg_yn: "N",
    p_item_category_code: input.categoryCode,
    p_product_cls_code: "02",
    p_regday: kstDate(input.now ?? new Date()),
    p_returntype: "json",
  }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("KAMIS_REQUEST_FAILED");

  const item = selectedItem(responseItems(await response.json().catch(() => null)), input);
  const point = item ? pricePoint(item) : null;
  if (!item || !point) throw new Error("KAMIS_ITEM_NOT_FOUND");

  const unit = asText(item.unit);
  if (!unit) throw new Error("KAMIS_MALFORMED_RESPONSE");

  return {
    itemName: asText(item.item_name) || input.itemName,
    kindName: asText(item.kind_name) || null,
    grade: asText(item.rank) || input.grade,
    unit,
    marketName: "전체지역",
    ...point,
  };
}
