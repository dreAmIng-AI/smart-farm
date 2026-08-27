import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { getPublicReferenceCropProfile } from "@/lib/crop-packs/public-reference-profiles";
import {
  fetchNongsaroCropReference,
  NONGSARO_CROP_REFERENCE_SOURCE,
  type CropReferenceData,
} from "@/lib/integrations/nongsaro-crop-reference";

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

export type CropReferenceIntegrationResult =
  | { status: "available"; data: CropReferenceData; provenance: Provenance }
  | { status: "stale"; data: CropReferenceData; message: string; provenance: Provenance }
  | { status: "unavailable"; data: null; message: string };

const CROP_INFORMATION_FRESH_TTL_MS = 24 * 60 * 60 * 1000;
const CROP_INFORMATION_MAX_STALE_MS = 30 * 24 * 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isCropReferenceData(value: unknown): value is CropReferenceData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return typeof data.officialCropName === "string" && Array.isArray(data.items) && data.items.every((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return false;
    const reference = item as Record<string, unknown>;
    return typeof reference.title === "string" &&
      (typeof reference.publishedAt === "string" || reference.publishedAt === null) &&
      (typeof reference.referenceUrl === "string" || reference.referenceUrl === null);
  });
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

function resultFromFreshSnapshot(snapshot: SnapshotRow): CropReferenceIntegrationResult | null {
  if (!isCropReferenceData(snapshot.payload) || new Date(snapshot.expires_at).getTime() < Date.now()) return null;
  return { status: "available", data: snapshot.payload, provenance: snapshotProvenance(snapshot, "fresh") };
}

function resultFromStaleSnapshot(snapshot: SnapshotRow | null): CropReferenceIntegrationResult | null {
  if (!snapshot || !isCropReferenceData(snapshot.payload)) return null;
  const age = Date.now() - new Date(snapshot.retrieved_at).getTime();
  if (!Number.isFinite(age) || age > CROP_INFORMATION_MAX_STALE_MS) return null;

  return {
    status: "stale",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "stale"),
    message: "최신 재배 참고자료를 불러오지 못했습니다. 마지막으로 확인한 공식 자료를 보여드립니다.",
  };
}

export async function GET(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);

  const cropCycleId = new URL(request.url).searchParams.get("cropCycleId");
  if (!cropCycleId || !isUuid(cropCycleId)) {
    const result: CropReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "재배 참고자료를 보려면 현재 작기를 선택해 주세요.",
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
  if (!profile) {
    const result: CropReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "현재 작물에 연결된 공식 재배 참고자료를 준비 중입니다.",
    };
    return NextResponse.json(result);
  }

  const contextKey = `nongsaro-crop-tech-v1:${profile.cropCode}`;
  const { data: snapshotData } = await auth.supabase
    .from("external_data_snapshots")
    .select("expires_at, observed_at, payload, provider, published_at, retrieved_at, source_name, source_reference, verification_status")
    .eq("farm_id", farmId)
    .eq("module", "crop_information")
    .eq("context_key", contextKey)
    .maybeSingle();
  const snapshot = snapshotData as SnapshotRow | null;
  const cachedResult = snapshot ? resultFromFreshSnapshot(snapshot) : null;
  if (cachedResult) return NextResponse.json(cachedResult);

  try {
    const data = await fetchNongsaroCropReference(profile.nongsaroCropName);
    const now = new Date();
    const retrievedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + CROP_INFORMATION_FRESH_TTL_MS).toISOString();
    const publishedAt = data.items.find((item) => item.publishedAt !== null)?.publishedAt ?? null;
    const { error: snapshotError } = await auth.supabase
      .from("external_data_snapshots")
      .upsert(
        {
          farm_id: farmId,
          module: "crop_information",
          context_key: contextKey,
          payload: data,
          provider: NONGSARO_CROP_REFERENCE_SOURCE.provider,
          source_name: NONGSARO_CROP_REFERENCE_SOURCE.sourceName,
          source_reference: NONGSARO_CROP_REFERENCE_SOURCE.sourceReference,
          observed_at: null,
          published_at: publishedAt,
          retrieved_at: retrievedAt,
          expires_at: expiresAt,
          verification_status: "official_source",
        },
        { onConflict: "farm_id,module,context_key" },
      );
    // A cache write failure must not discard an otherwise valid official response.
    void snapshotError;

    const result: CropReferenceIntegrationResult = {
      status: "available",
      data,
      provenance: {
        ...NONGSARO_CROP_REFERENCE_SOURCE,
        observedAt: null,
        publishedAt,
        retrievedAt,
        verificationStatus: "official_source",
        freshness: "fresh",
      },
    };
    return NextResponse.json(result);
  } catch {
    const staleResult = resultFromStaleSnapshot(snapshot);
    if (staleResult) return NextResponse.json(staleResult);

    const result: CropReferenceIntegrationResult = {
      status: "unavailable",
      data: null,
      message: "공식 재배 참고자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
    };
    return NextResponse.json(result);
  }
}
