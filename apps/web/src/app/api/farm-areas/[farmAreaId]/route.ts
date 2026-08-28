import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseFarmAreaInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmAreaId: string }> };

type FarmAreaRow = {
  created_at: string;
  description: string | null;
  farm_id: string;
  id: string;
  name: string;
  updated_at: string;
};

function toFarmArea(area: FarmAreaRow) {
  return {
    id: area.id,
    farmId: area.farm_id,
    name: area.name,
    description: area.description,
    createdAt: area.created_at,
    updatedAt: area.updated_at,
  };
}

async function findAccessibleFarmArea(
  farmAreaId: string,
  auth: Awaited<ReturnType<typeof requireAuthenticatedSupabaseUser>>,
) {
  if (!auth.ok) {
    return auth;
  }

  const { data, error } = await auth.supabase
    .from("farm_areas")
    .select("id, farm_id, name, description, created_at, updated_at")
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

  if (!data) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_AREA_NOT_FOUND", message: "FarmArea not found or not accessible." } },
        { status: 404 },
      ),
    };
  }

  return { ok: true as const, area: data as FarmAreaRow };
}

async function hasLinkedRecords(
  auth: Extract<Awaited<ReturnType<typeof requireAuthenticatedSupabaseUser>>, { ok: true }>,
  farmAreaId: string,
) {
  const tables = ["crop_cycles", "farm_tasks", "observations", "measurements"] as const;

  for (const table of tables) {
    const { data, error } = await auth.supabase
      .from(table)
      .select("id")
      .eq("farm_area_id", farmAreaId)
      .limit(1);

    if (error) {
      return { ok: false as const, message: error.message };
    }

    if ((data ?? []).length > 0) {
      return { ok: true as const, linked: true };
    }
  }

  return { ok: true as const, linked: false };
}

export async function PATCH(request: Request, context: RouteContext) {
  const { farmAreaId } = await context.params;
  if (!isUuid(farmAreaId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmAreaId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmAreaInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const existing = await findAccessibleFarmArea(farmAreaId, auth);
  if (!existing.ok) {
    return existing.response;
  }

  const authorization = await requireFarmManager(auth, existing.area.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { data, error } = await auth.supabase
    .from("farm_areas")
    .update({ name: parsed.data.name, description: parsed.data.description })
    .eq("id", farmAreaId)
    .select("id, farm_id, name, description, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_AREA_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(toFarmArea(data as FarmAreaRow));
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { farmAreaId } = await context.params;
  if (!isUuid(farmAreaId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmAreaId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const existing = await findAccessibleFarmArea(farmAreaId, auth);
  if (!existing.ok) {
    return existing.response;
  }

  const authorization = await requireFarmManager(auth, existing.area.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  const linkedRecords = await hasLinkedRecords(auth, farmAreaId);
  if (!linkedRecords.ok) {
    return NextResponse.json(
      { error: { code: "FARM_AREA_REFERENCE_LOOKUP_FAILED", message: linkedRecords.message } },
      { status: 400 },
    );
  }

  if (linkedRecords.linked) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_AREA_IN_USE",
          message: "FarmArea linked to a crop cycle, task, observation, or measurement cannot be deleted.",
        },
      },
      { status: 409 },
    );
  }

  const { data, error } = await auth.supabase
    .from("farm_areas")
    .delete()
    .eq("id", farmAreaId)
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23503") {
      return NextResponse.json(
        {
          error: {
            code: "FARM_AREA_IN_USE",
            message: "FarmArea linked to a crop cycle, task, observation, or measurement cannot be deleted.",
          },
        },
        { status: 409 },
      );
    }

    return NextResponse.json(
      { error: { code: "FARM_AREA_DELETE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: "FARM_AREA_NOT_FOUND", message: "FarmArea not found or not accessible." } },
      { status: 404 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
