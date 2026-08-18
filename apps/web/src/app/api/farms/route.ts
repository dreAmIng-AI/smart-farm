import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { getFarmCreationPermission, requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { parseFarmInput } from "@/lib/api/validation";

type FarmRow = {
  id: string;
  name: string;
  region_code: string;
  cultivation_environment: "facility" | "open_field";
  cultivation_method: string | null;
};

export async function GET() {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const permission = await getFarmCreationPermission(auth);
  if (!permission.ok) {
    return permission.response;
  }

  const { data, error } = await auth.supabase
    .from("farms")
    .select("id, name, region_code, cultivation_environment, cultivation_method")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const items = ((data ?? []) as FarmRow[]).map((farm) => ({
    id: farm.id,
    name: farm.name,
    regionCode: farm.region_code,
    cultivationEnvironment: farm.cultivation_environment,
    cultivationMethod: farm.cultivation_method,
  }));

  return NextResponse.json({
    items,
    meta: { count: items.length },
    permissions: { canCreateFarm: permission.canCreateFarm },
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const permission = await getFarmCreationPermission(auth);
  if (!permission.ok) {
    return permission.response;
  }

  if (!permission.canCreateFarm) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_CREATION_FORBIDDEN",
          message: "Only Farm owners can create a new Farm.",
        },
      },
      { status: 403 },
    );
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const farmId = randomUUID();
  const { error } = await auth.supabase
    .from("farms")
    .insert({
      id: farmId,
      name: parsed.data.name,
      region_code: parsed.data.regionCode,
      cultivation_environment: parsed.data.cultivationEnvironment,
      cultivation_method: parsed.data.cultivationMethod,
    });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_CREATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      id: farmId,
      name: parsed.data.name,
      regionCode: parsed.data.regionCode,
      cultivationEnvironment: parsed.data.cultivationEnvironment,
      cultivationMethod: parsed.data.cultivationMethod,
    },
    { status: 201 },
  );
}
