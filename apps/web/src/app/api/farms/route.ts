import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { parseFarmInput } from "@/lib/api/validation";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase
    .from("farms")
    .insert({
      name: parsed.data.name,
      region_code: parsed.data.regionCode,
      cultivation_environment: parsed.data.cultivationEnvironment,
      cultivation_method: parsed.data.cultivationMethod,
    })
    .select("id, name, region_code, cultivation_environment, cultivation_method")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_CREATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      id: data.id,
      name: data.name,
      regionCode: data.region_code,
      cultivationEnvironment: data.cultivation_environment,
      cultivationMethod: data.cultivation_method,
    },
    { status: 201 },
  );
}
