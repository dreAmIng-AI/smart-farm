import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ cropCycleId: string }> };
type GeneratedTaskRow = { generated_count: number; task_ids: string[] | null };

export async function POST(_request: Request, context: RouteContext) {
  const { cropCycleId } = await context.params;
  if (!isUuid(cropCycleId)) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "cropCycleId must be a UUID.",
        },
      },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { data: cropCycle, error: cropCycleError } = await auth.supabase
    .from("crop_cycles")
    .select("id")
    .eq("id", cropCycleId)
    .maybeSingle();

  if (cropCycleError) {
    return NextResponse.json(
      {
        error: {
          code: "CROP_CYCLE_LOOKUP_FAILED",
          message: cropCycleError.message,
        },
      },
      { status: 400 },
    );
  }

  if (!cropCycle) {
    return NextResponse.json(
      {
        error: {
          code: "CROP_CYCLE_NOT_FOUND",
          message: "Crop cycle not found or not accessible.",
        },
      },
      { status: 404 },
    );
  }

  const { data, error } = await auth.supabase.rpc("generate_planned_farm_tasks", {
    p_crop_cycle_id: cropCycleId,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "TASK_GENERATION_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const result = (data as GeneratedTaskRow[] | null)?.[0] ?? {
    generated_count: 0,
    task_ids: [],
  };

  return NextResponse.json({
    generatedCount: result.generated_count,
    taskIds: result.task_ids ?? [],
  });
}
