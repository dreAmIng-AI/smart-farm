import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseFarmAreaInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type FarmAreaRow = {
  created_at: string;
  description: string | null;
  id: string;
  name: string;
  updated_at: string;
};

async function findAccessibleFarm(farmId: string, auth: Awaited<ReturnType<typeof requireAuthenticatedSupabaseUser>>) {
  if (!auth.ok) {
    return auth;
  }

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

  return { ok: true as const, auth };
}

function toFarmArea(area: FarmAreaRow) {
  return {
    id: area.id,
    name: area.name,
    description: area.description,
    createdAt: area.created_at,
    updatedAt: area.updated_at,
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
    .from("farm_areas")
    .select("id, name, description, created_at, updated_at")
    .eq("farm_id", farmId)
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_AREA_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const items = ((data ?? []) as FarmAreaRow[]).map(toFarmArea);
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
  const parsed = parseFarmAreaInput(payload);
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

  const authorization = await requireFarmManager(auth, farmId);
  if (!authorization.ok) {
    return authorization.response;
  }

  const { data, error } = await auth.supabase
    .from("farm_areas")
    .insert({
      farm_id: farmId,
      name: parsed.data.name,
      description: parsed.data.description,
    })
    .select("id, name, description, created_at, updated_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_AREA_CREATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(toFarmArea(data as FarmAreaRow), { status: 201 });
}
