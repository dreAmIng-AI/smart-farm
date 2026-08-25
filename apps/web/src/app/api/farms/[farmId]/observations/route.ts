import { NextResponse } from "next/server";

import {
  requireAuthenticatedSupabaseUser,
  type AuthenticatedSupabaseContext,
} from "@/lib/api/auth";
import { isUuid, parseObservationInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type ObservationRow = {
  content: string;
  created_at: string;
  crop_cycle_id: string | null;
  farm_area_id: string | null;
  id: string;
  observed_at: string;
  observed_by: string;
};

type ObservationIssueRow = {
  id: string;
  observation_id: string;
  status: "open" | "needs_review" | "resolved" | "closed_without_action";
};

async function findAccessibleFarm(farmId: string, auth: AuthenticatedSupabaseContext) {
  const { data, error } = await auth.supabase.from("farms").select("id").eq("id", farmId).maybeSingle();
  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_LOOKUP_FAILED", message: error.message } },
        { status: 400 },
      ),
    };
  }

  if (!data) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
        { status: 404 },
      ),
    };
  }

  return { ok: true as const };
}

async function validateFarmContext(
  auth: AuthenticatedSupabaseContext,
  farmId: string,
  farmAreaId: string | null,
  cropCycleId: string | null,
) {
  if (farmAreaId) {
    const { data, error } = await auth.supabase
      .from("farm_areas")
      .select("id, farm_id")
      .eq("id", farmAreaId)
      .maybeSingle();
    if (error) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: { code: "FARM_AREA_LOOKUP_FAILED", message: error.message } },
          { status: 400 },
        ),
      };
    }
    if (!data || data.farm_id !== farmId) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: { code: "FARM_AREA_NOT_FOUND", message: "FarmArea was not found in this Farm." } },
          { status: 404 },
        ),
      };
    }
  }

  if (cropCycleId) {
    const { data, error } = await auth.supabase
      .from("crop_cycles")
      .select("id, farm_id")
      .eq("id", cropCycleId)
      .maybeSingle();
    if (error) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: { code: "CROP_CYCLE_LOOKUP_FAILED", message: error.message } },
          { status: 400 },
        ),
      };
    }
    if (!data || data.farm_id !== farmId) {
      return {
        ok: false as const,
        response: NextResponse.json(
          { error: { code: "CROP_CYCLE_NOT_FOUND", message: "CropCycle was not found in this Farm." } },
          { status: 404 },
        ),
      };
    }
  }

  return { ok: true as const };
}

function toObservation(observation: ObservationRow, issue?: ObservationIssueRow) {
  return {
    id: observation.id,
    farmAreaId: observation.farm_area_id,
    cropCycleId: observation.crop_cycle_id,
    observedBy: observation.observed_by,
    observedAt: observation.observed_at,
    content: observation.content,
    createdAt: observation.created_at,
    issue: issue
      ? {
          id: issue.id,
          status: issue.status,
        }
      : null,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const farm = await findAccessibleFarm(farmId, auth);
  if (!farm.ok) {
    return farm.response;
  }

  const { data, error } = await auth.supabase
    .from("observations")
    .select("id, farm_area_id, crop_cycle_id, observed_by, observed_at, content, created_at")
    .eq("farm_id", farmId)
    .order("observed_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "OBSERVATION_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const observations = (data ?? []) as ObservationRow[];
  if (observations.length === 0) {
    return NextResponse.json({ items: [], meta: { count: 0 } });
  }

  const { data: issueData, error: issueError } = await auth.supabase
    .from("issue_records")
    .select("id, observation_id, status")
    .in("observation_id", observations.map((observation) => observation.id));
  if (issueError) {
    return NextResponse.json(
      { error: { code: "OBSERVATION_LOOKUP_FAILED", message: issueError.message } },
      { status: 400 },
    );
  }

  const issueByObservationId = new Map(
    ((issueData ?? []) as ObservationIssueRow[]).map((issue) => [issue.observation_id, issue]),
  );
  const items = observations.map((observation) => toObservation(observation, issueByObservationId.get(observation.id)));
  return NextResponse.json({ items, meta: { count: items.length } });
}

export async function POST(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseObservationInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const farm = await findAccessibleFarm(farmId, auth);
  if (!farm.ok) {
    return farm.response;
  }

  const validation = await validateFarmContext(
    auth,
    farmId,
    parsed.data.farmAreaId,
    parsed.data.cropCycleId,
  );
  if (!validation.ok) {
    return validation.response;
  }

  const { data, error } = await auth.supabase
    .from("observations")
    .insert({
      farm_id: farmId,
      farm_area_id: parsed.data.farmAreaId,
      crop_cycle_id: parsed.data.cropCycleId,
      observed_by: auth.userId,
      observed_at: parsed.data.observedAt,
      content: parsed.data.content,
    })
    .select("id, farm_area_id, crop_cycle_id, observed_by, observed_at, content, created_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "OBSERVATION_CREATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(toObservation(data as ObservationRow), { status: 201 });
}
