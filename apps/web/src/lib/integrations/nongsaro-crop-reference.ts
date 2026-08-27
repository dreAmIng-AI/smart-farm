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

function firstCode(items: XmlItem[], codeField: string) {
  const code = items[0]?.[codeField];
  if (!code) throw new Error("NONGSARO_CROP_NOT_FOUND");
  return code;
}

function normalizedName(value: string) {
  return value.replaceAll(/\s+/g, "").trim();
}

function exactCropCode(items: XmlItem[], officialCropName: string) {
  const selected = items.find((item) => normalizedName(item.subCategoryNm ?? "") === normalizedName(officialCropName));
  if (!selected?.subCategoryCode) throw new Error("NONGSARO_CROP_NOT_FOUND");
  return selected.subCategoryCode;
}

function diseasePestMainTechCode(items: XmlItem[]) {
  const selected = items.find((item) => (item.mainTechNm ?? "").includes("병해충"));
  if (!selected?.mainTechCode) throw new Error("NONGSARO_DISEASE_PEST_CATEGORY_NOT_FOUND");
  return selected.mainTechCode;
}

function diseasePestSubTechCodes(items: XmlItem[]) {
  const codes = items
    .filter((item) => /병|충/.test(item.subTechNm ?? ""))
    .map((item) => item.subTechCode)
    .filter((code): code is string => Boolean(code));
  if (codes.length === 0) throw new Error("NONGSARO_DISEASE_PEST_CATEGORY_NOT_FOUND");
  return [...new Set(codes)].slice(0, 2);
}

async function resolveCropReferenceCodes(officialCropName: string) {
  const mainCategoryCode = firstCode(
    await requestItems("mainCategoryList", { subCategoryNm: officialCropName }, ["mainCategoryCode"]),
    "mainCategoryCode",
  );
  const middleCategoryCode = firstCode(
    await requestItems("middleCategoryList", { mainCategoryCode, subCategoryNm: officialCropName }, ["middleCategoryCode"]),
    "middleCategoryCode",
  );
  const subCategoryCode = exactCropCode(
    await requestItems("subCategoryList", { middleCategoryCode, subCategoryNm: officialCropName }, ["subCategoryCode", "subCategoryNm"]),
    officialCropName,
  );
  const mainTechCode = diseasePestMainTechCode(
    await requestItems("mainTechList", { subCategoryCode }, ["mainTechCode", "mainTechNm"]),
  );
  const subTechCodes = diseasePestSubTechCodes(
    await requestItems("subTechList", { mainCategoryCode, mainTechCode, middleCategoryCode, subCategoryCode }, ["subTechCode", "subTechNm"]),
  );

  return { subCategoryCode, subTechCodes };
}

export async function fetchNongsaroCropReference(officialCropName: string): Promise<CropReferenceData> {
  const { subCategoryCode, subTechCodes } = await resolveCropReferenceCodes(officialCropName);
  const itemLists = await Promise.all(subTechCodes.map((subTechCode) => requestItems(
    "techInfoList",
    { pageNo: "1", subCategoryCode, subTechCode },
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
