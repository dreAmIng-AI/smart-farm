import { randomUUID } from "node:crypto";

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
