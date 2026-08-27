import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { getPublicReferenceCropProfile } from "@/lib/crop-packs/public-reference-profiles";
import {
  fetchKamisNationalWholesaleReference,
  KAMIS_MARKET_SOURCE,
  type MarketReferenceData,
} from "@/lib/integrations/kamis-market";

type RouteContext = { params: Promise<{ farmId: string }> };

type CropCycleRow = {
  crop_code: string;
  farm_id: string;
  id: string;
};

type SnapshotRow = {
  expires_at: string;
  observed_at: string | null;
  payload: unknown;
  provider: string;
  published_at: string | null;
  retrieved_at: string;
  source_name: string;
  source_reference: string;
  verification_status: "official_source" | "cached_official_source";
};

type Provenance = {
  freshness: "fresh" | "stale";
  observedAt: string | null;
  provider: string;
  publishedAt: string | null;
  retrievedAt: string;
  sourceName: string;
  sourceReference: string;
  verificationStatus: "official_source" | "cached_official_source";
};

export type MarketReferenceIntegrationResult =
  | { status: "available"; data: MarketReferenceData; provenance: Provenance }
  | { status: "stale"; data: MarketReferenceData; message: string; provenance: Provenance }
  | { status: "unavailable"; data: null; message: string };

const MARKET_FRESH_TTL_MS = 6 * 60 * 60 * 1000;
const MARKET_MAX_STALE_MS = 48 * 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isMarketReferenceData(value: unknown): value is MarketReferenceData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.itemName === "string" &&
    (typeof data.kindName === "string" || data.kindName === null) &&
    typeof data.grade === "string" &&
    data.marketName === "전체지역" &&
    typeof data.unit === "string" &&
    typeof data.priceWon === "number" && Number.isFinite(data.priceWon) &&
    (typeof data.previousPriceWon === "number" || data.previousPriceWon === null) &&
    typeof data.baseDate === "string";
}

function snapshotProvenance(snapshot: SnapshotRow, freshness: "fresh" | "stale"): Provenance {
  return {
    provider: snapshot.provider,
    sourceName: snapshot.source_name,
    sourceReference: snapshot.source_reference,
    observedAt: snapshot.observed_at,
    publishedAt: snapshot.published_at,
    retrievedAt: snapshot.retrieved_at,
    verificationStatus: "cached_official_source",
    freshness,
  };
}

function resultFromFreshSnapshot(snapshot: SnapshotRow): MarketReferenceIntegrationResult | null {
  if (!isMarketReferenceData(snapshot.payload) || new Date(snapshot.expires_at).getTime() < Date.now()) return null;
  return { status: "available", data: snapshot.payload, provenance: snapshotProvenance(snapshot, "fresh") };
}

function resultFromStaleSnapshot(snapshot: SnapshotRow | null): MarketReferenceIntegrationResult | null {
  if (!snapshot || !isMarketReferenceData(snapshot.payload)) return null;
  const age = Date.now() - new Date(snapshot.retrieved_at).getTime();
  if (!Number.isFinite(age) || age > MARKET_MAX_STALE_MS) return null;

  return {
    status: "stale",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "stale"),
    message: "최신 시장정보를 불러오지 못했습니다. 마지막으로 확인한 공식 참고가격을 보여드립니다.",
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);

  const cropCycleId = new URL(request.url).searchParams.get("cropCycleId");
  if (!cropCycleId || !isUuid(cropCycleId)) {
    const result: MarketReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "시장 참고가격을 보려면 현재 작기를 선택해 주세요.",
    };
    return NextResponse.json(result);
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) return auth.response;

  const { data: farmData, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();
  if (farmError) return errorResponse("FARM_LOOKUP_FAILED", farmError.message, 400);
  if (!farmData) return errorResponse("FARM_NOT_FOUND", "Farm not found or not accessible.", 404);

  const { data: cropCycleData, error: cropCycleError } = await auth.supabase
    .from("crop_cycles")
    .select("id, farm_id, crop_code")
    .eq("id", cropCycleId)
    .eq("farm_id", farmId)
    .maybeSingle();
  if (cropCycleError) return errorResponse("CROP_CYCLE_LOOKUP_FAILED", cropCycleError.message, 400);
  if (!cropCycleData) return errorResponse("CROP_CYCLE_NOT_FOUND", "CropCycle not found or not accessible.", 404);

  const cropCycle = cropCycleData as CropCycleRow;
  const profile = getPublicReferenceCropProfile(cropCycle.crop_code);
  if (!profile?.kamisMarketReference) {
    const result: MarketReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "현재 작물에 연결된 전국 도매 참고가격을 준비 중입니다.",
    };
    return NextResponse.json(result);
  }

  const reference = profile.kamisMarketReference;
  const contextKey = `kamis-national-wholesale-v1:${profile.cropCode}:${reference.categoryCode}:${reference.itemName}:${reference.grade}`;
  const { data: snapshotData } = await auth.supabase
    .from("external_data_snapshots")
    .select("expires_at, observed_at, payload, provider, published_at, retrieved_at, source_name, source_reference, verification_status")
    .eq("farm_id", farmId)
    .eq("module", "market")
    .eq("context_key", contextKey)
    .maybeSingle();
  const snapshot = snapshotData as SnapshotRow | null;
  const cachedResult = snapshot ? resultFromFreshSnapshot(snapshot) : null;
  if (cachedResult) return NextResponse.json(cachedResult);

  try {
    const data = await fetchKamisNationalWholesaleReference(reference);
    const now = new Date();
    const retrievedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + MARKET_FRESH_TTL_MS).toISOString();
    const { error: snapshotError } = await auth.supabase
      .from("external_data_snapshots")
      .upsert(
        {
          farm_id: farmId,
          module: "market",
          context_key: contextKey,
          payload: data,
          provider: KAMIS_MARKET_SOURCE.provider,
          source_name: KAMIS_MARKET_SOURCE.sourceName,
          source_reference: KAMIS_MARKET_SOURCE.sourceReference,
          observed_at: data.baseDate,
          published_at: data.baseDate,
          retrieved_at: retrievedAt,
          expires_at: expiresAt,
          verification_status: "official_source",
        },
        { onConflict: "farm_id,module,context_key" },
      );
    // A cache write failure must not discard an otherwise valid official response.
    void snapshotError;

    const result: MarketReferenceIntegrationResult = {
      status: "available",
      data,
      provenance: {
        ...KAMIS_MARKET_SOURCE,
        observedAt: data.baseDate,
        publishedAt: data.baseDate,
        retrievedAt,
        verificationStatus: "official_source",
        freshness: "fresh",
      },
    };
    return NextResponse.json(result);
  } catch {
    const staleResult = resultFromStaleSnapshot(snapshot);
    if (staleResult) return NextResponse.json(staleResult);

    const result: MarketReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "시장정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
    };
    return NextResponse.json(result);
  }
}
