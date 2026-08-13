import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ cropCycleId: string }> };

type FarmTaskRow = {
  id: string;
  parent_issue_id: string | null;
  title: string;
  task_type: string;
  reason: string;
  priority: "low" | "medium" | "high";
  scheduled_for: string;
  evidence: unknown[];
  verification_status: string;
  source_type: string;
  status: string;
  result_required: boolean;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .select(
      "id, parent_issue_id, title, task_type, reason, priority, scheduled_for, evidence, verification_status, source_type, status, result_required",
    )
    .eq("crop_cycle_id", cropCycleId)
    .order("scheduled_for", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "SCHEDULE_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const rows = (data ?? []) as FarmTaskRow[];
  return NextResponse.json({
    items: rows.map((task) => ({
      id: task.id,
      parentIssueId: task.parent_issue_id,
      title: task.title,
      taskType: task.task_type,
      reason: task.reason,
      priority: task.priority,
      scheduledFor: task.scheduled_for,
      evidence: task.evidence,
      verificationStatus: task.verification_status,
      sourceType: task.source_type,
      status: task.status,
      resultRequired: task.result_required,
    })),
    meta: { count: rows.length },
  });
}
