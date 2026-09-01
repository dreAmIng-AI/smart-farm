import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import {
  fetchNongsaroDiseasePest,
  NONGSARO_DISEASE_PEST_SOURCE,
  type DiseasePestData,
} from "@/lib/integrations/nongsaro-disease-pest";
import { getNongsaroFailureCode, type NongsaroFailureCode } from "@/lib/integrations/nongsaro-failure";

type RouteContext = { params: Promise<{ farmId: string }> };

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

export type DiseasePestIntegrationResult =
  | { status: "available"; data: DiseasePestData; provenance: Provenance }
  | { status: "stale"; data: DiseasePestData; message: string; provenance: Provenance }
  | { status: "unavailable"; data: null; message: string };

const DISEASE_PEST_CONTEXT_KEY = "nongsaro-v1:national-occurrence-bulletin";
const DISEASE_PEST_FRESH_TTL_MS = 24 * 60 * 60 * 1000;
const DISEASE_PEST_MAX_STALE_MS = 7 * 24 * 60 * 60 * 1000;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function logDiseasePestFailure(error: unknown) {
  const code = getNongsaroFailureCode(error);
  // Do not include the request URL, credentials, response body or Farm context in logs.
  console.error(JSON.stringify({ event: "integration.disease_pest.failed", provider: "Nongsaro", code }));
  return code;
}

function unavailableDiseasePestMessage(code: NongsaroFailureCode) {
  if (code === "NONGSARO_API_KEY_NOT_CONFIGURED") {
    return "공식 병해충 발생정보 연결을 아직 마치지 못했습니다. 농장 작업과 기록은 계속 사용할 수 있습니다.";
  }
  return "현재 확인 가능한 공식 병해충 발생정보가 없습니다. 잠시 후 다시 확인해 주세요.";
}

function isDiseasePestData(value: unknown): value is DiseasePestData {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const data = value as Record<string, unknown>;
  return data.scope === "national_occurrence_bulletin" && Array.isArray(data.bulletins) && data.bulletins.every((bulletin) => {
    if (typeof bulletin !== "object" || bulletin === null || Array.isArray(bulletin)) return false;
    const item = bulletin as Record<string, unknown>;
    return typeof item.title === "string" && typeof item.publishedAt === "string" && (typeof item.attachmentUrl === "string" || item.attachmentUrl === null);
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

function resultFromFreshSnapshot(snapshot: SnapshotRow): DiseasePestIntegrationResult | null {
  if (!isDiseasePestData(snapshot.payload) || new Date(snapshot.expires_at).getTime() < Date.now()) return null;

  return {
    status: "available",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "fresh"),
  };
}

function resultFromStaleSnapshot(snapshot: SnapshotRow | null): DiseasePestIntegrationResult | null {
  if (!snapshot || !isDiseasePestData(snapshot.payload)) return null;
  const age = Date.now() - new Date(snapshot.retrieved_at).getTime();
  if (!Number.isFinite(age) || age > DISEASE_PEST_MAX_STALE_MS) return null;

  return {
    status: "stale",
    data: snapshot.payload,
    provenance: snapshotProvenance(snapshot, "stale"),
    message: "최신 병해충 발생정보를 불러오지 못했습니다. 마지막으로 확인한 공식 정보를 보여드립니다.",
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
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

  const { data: snapshotData } = await auth.supabase
    .from("external_data_snapshots")
    .select("expires_at, observed_at, payload, provider, published_at, retrieved_at, source_name, source_reference, verification_status")
    .eq("farm_id", farmId)
    .eq("module", "disease_pest")
    .eq("context_key", DISEASE_PEST_CONTEXT_KEY)
    .maybeSingle();
  const snapshot = snapshotData as SnapshotRow | null;
  const cachedResult = snapshot ? resultFromFreshSnapshot(snapshot) : null;
  if (cachedResult) return NextResponse.json(cachedResult);

  try {
    const data = await fetchNongsaroDiseasePest();
    const now = new Date();
    const retrievedAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + DISEASE_PEST_FRESH_TTL_MS).toISOString();
    const publishedAt = data.bulletins[0]?.publishedAt ?? null;
    const { error: snapshotError } = await auth.supabase
      .from("external_data_snapshots")
      .upsert(
        {
          farm_id: farmId,
          module: "disease_pest",
          context_key: DISEASE_PEST_CONTEXT_KEY,
          payload: data,
          provider: NONGSARO_DISEASE_PEST_SOURCE.provider,
          source_name: NONGSARO_DISEASE_PEST_SOURCE.sourceName,
          source_reference: NONGSARO_DISEASE_PEST_SOURCE.sourceReference,
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

    const result: DiseasePestIntegrationResult = {
      status: "available",
      data,
      provenance: {
        ...NONGSARO_DISEASE_PEST_SOURCE,
        observedAt: null,
        publishedAt,
        retrievedAt,
        verificationStatus: "official_source",
        freshness: "fresh",
      },
    };
    return NextResponse.json(result);
  } catch (error) {
    const failureCode = logDiseasePestFailure(error);
    const staleResult = resultFromStaleSnapshot(snapshot);
    if (staleResult) return NextResponse.json(staleResult);

    const result: DiseasePestIntegrationResult = {
      status: "unavailable",
      data: null,
      message: unavailableDiseasePestMessage(failureCode),
    };
    return NextResponse.json(result);
  }
}
