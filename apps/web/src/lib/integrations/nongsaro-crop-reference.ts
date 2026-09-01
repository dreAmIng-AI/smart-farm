const NONGSARO_CROP_TECH_BASE_URL = "https://api.nongsaro.go.kr/service/cropTechInfo";

export const NONGSARO_CROP_REFERENCE_SOURCE = {
  provider: "Nongsaro",
  sourceName: "농사로 작목기술 서비스",
  sourceReference: "https://api.nongsaro.go.kr/sample/rest/cropTechInfo/cropTechInfo.jsp",
} as const;

export type CropReferenceItem = {
  publishedAt: string | null;
  referenceUrl: string | null;
  title: string;
};

export type CropReferenceData = {
  items: CropReferenceItem[];
  officialCropName: string;
};

export type NongsaroCropTechReference = {
  diseasePestMainTechCode: string;
  diseasePestSubTechCodes: string[];
  mainCategoryCode: string;
  middleCategoryCode: string;
  subCategoryCode: string;
};

type XmlItem = Record<string, string | null>;

function decodeXmlText(value: string) {
  return value
    .replace(/^<!\[CDATA\[([\s\S]*)\]\]>$/, "$1")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'")
    .trim();
}

function xmlTag(xml: string, tag: string) {
  const match = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`).exec(xml);
  return match ? decodeXmlText(match[1]) : null;
}

function xmlItems(xml: string, fields: string[]): XmlItem[] {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => Object.fromEntries(
    fields.map((field) => [field, xmlTag(match[1], field)]),
  ));
}

function toPublishedAt(value: string | null) {
  const date = value?.replaceAll(/[^0-9]/g, "") ?? "";
  if (!/^\d{8}$/.test(date)) return null;

  const parsed = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toOfficialReferenceUrl(value: string | null) {
  if (!value) return null;

  try {
    const url = new URL(value, "https://www.nongsaro.go.kr");
    const isOfficialHost = url.hostname === "nongsaro.go.kr" || url.hostname.endsWith(".nongsaro.go.kr");
    if (!isOfficialHost || !["http:", "https:"].includes(url.protocol)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

function requiredApiKey() {
  const apiKey = process.env.NONGSARO_API_KEY;
  if (!apiKey) throw new Error("NONGSARO_API_KEY_NOT_CONFIGURED");
  return apiKey;
}

async function requestItems(operation: string, params: Record<string, string>, fields: string[]) {
  const url = new URL(`${NONGSARO_CROP_TECH_BASE_URL}/${operation}`);
  url.search = new URLSearchParams({ apiKey: requiredApiKey(), ...params }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) throw new Error("NONGSARO_REQUEST_FAILED");

  const xml = await response.text();
  if (xmlTag(xml, "resultCode") !== "00") throw new Error("NONGSARO_RESPONSE_ERROR");
  return xmlItems(xml, fields);
}

export async function fetchNongsaroCropReference(
  officialCropName: string,
  reference: NongsaroCropTechReference,
): Promise<CropReferenceData> {
  if (reference.diseasePestSubTechCodes.length === 0) {
    throw new Error("NONGSARO_DISEASE_PEST_CATEGORY_NOT_FOUND");
  }

  const itemLists = await Promise.all(reference.diseasePestSubTechCodes.map((subTechCode) => requestItems(
    "techInfoList",
    {
      mainCategoryCode: reference.mainCategoryCode,
      middleCategoryCode: reference.middleCategoryCode,
      subCategoryCode: reference.subCategoryCode,
      mainTechCode: reference.diseasePestMainTechCode,
      pageNo: "1",
      subTechCode,
    },
    ["fileDownUrl", "regDt", "techNm"],
  )));
  const seenTitles = new Set<string>();
  const items = itemLists
    .flat()
    .flatMap((item) => {
      const title = item.techNm;
      if (!title || seenTitles.has(title)) return [];
      seenTitles.add(title);
      return [{
        title,
        publishedAt: toPublishedAt(item.regDt),
        referenceUrl: toOfficialReferenceUrl(item.fileDownUrl),
      }];
    })
    .slice(0, 3);

  if (items.length === 0) throw new Error("NONGSARO_EMPTY_RESPONSE");
  return { officialCropName, items };
}
