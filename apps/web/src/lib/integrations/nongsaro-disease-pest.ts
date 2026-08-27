const NONGSARO_DISEASE_PEST_ENDPOINT = "https://api.nongsaro.go.kr/service/dbyhsCccrrncInfo/dbyhsCccrrncInfoList";

export const NONGSARO_DISEASE_PEST_SOURCE = {
  provider: "Nongsaro",
  sourceName: "농사로 병해충 발생정보",
  sourceReference: "https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00200",
} as const;

export type DiseasePestBulletin = {
  attachmentUrl: string | null;
  publishedAt: string;
  title: string;
};

export type DiseasePestData = {
  bulletins: DiseasePestBulletin[];
  scope: "national_occurrence_bulletin";
};

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

function xmlItems(xml: string) {
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((match) => match[1]);
}

function toPublishedAt(value: string | null) {
  const date = value?.replaceAll(/[^0-9]/g, "") ?? "";
  if (!/^\d{8}$/.test(date)) return null;

  const parsed = new Date(`${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}T00:00:00+09:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function toOfficialAttachmentUrl(value: string | null) {
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

function readBulletins(xml: string): DiseasePestBulletin[] {
  const resultCode = xmlTag(xml, "resultCode");
  if (resultCode !== "00") {
    throw new Error("NONGSARO_RESPONSE_ERROR");
  }

  return xmlItems(xml)
    .map((item) => {
      const title = xmlTag(item, "cntntsSj");
      const publishedAt = toPublishedAt(xmlTag(item, "registDt"));
      if (!title || !publishedAt) return null;

      return {
        title,
        publishedAt,
        attachmentUrl: toOfficialAttachmentUrl(xmlTag(item, "downFile")),
      };
    })
    .filter((item): item is DiseasePestBulletin => item !== null)
    .slice(0, 3);
}

function requiredApiKey() {
  const apiKey = process.env.NONGSARO_API_KEY;
  if (!apiKey) {
    throw new Error("NONGSARO_API_KEY_NOT_CONFIGURED");
  }
  return apiKey;
}

export async function fetchNongsaroDiseasePest(): Promise<DiseasePestData> {
  const url = new URL(NONGSARO_DISEASE_PEST_ENDPOINT);
  url.search = new URLSearchParams({ apiKey: requiredApiKey(), pageNo: "1" }).toString();

  const response = await fetch(url, { signal: AbortSignal.timeout(8_000) });
  if (!response.ok) {
    throw new Error("NONGSARO_REQUEST_FAILED");
  }

  const bulletins = readBulletins(await response.text());
  if (bulletins.length === 0) {
    throw new Error("NONGSARO_EMPTY_RESPONSE");
  }

  return { bulletins, scope: "national_occurrence_bulletin" };
}
