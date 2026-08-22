import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { endOfSeoulDay, scheduleStateForToday } from "@/lib/core/today";

type RouteContext = { params: Promise<{ farmId: string }> };

type TodayTaskRow = {
  assigned_user_id: string | null;
  id: string;
  crop_cycle_id: string;
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

  const { data: farm, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();

  if (farmError) {
    return NextResponse.json(
      { error: { code: "FARM_LOOKUP_FAILED", message: farmError.message } },
      { status: 400 },
    );
  }

  if (!farm) {
    return NextResponse.json(
      { error: { code: "FARM_NOT_FOUND", message: "Farm not found or not accessible." } },
      { status: 404 },
    );
  }

  const now = new Date();
  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .select(
      "id, crop_cycle_id, parent_issue_id, assigned_user_id, title, task_type, reason, priority, scheduled_for, evidence, verification_status, source_type, status, result_required",
    )
    .eq("farm_id", farmId)
    .in("status", ["pending", "in_progress"])
    .lte("scheduled_for", endOfSeoulDay(now))
    .order("scheduled_for", { ascending: true });

  if (error) {
    return NextResponse.json(
      { error: { code: "TODAY_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const rows = (data ?? []) as TodayTaskRow[];
  return NextResponse.json({
    items: rows.map((task) => ({
      id: task.id,
      assignedUserId: task.assigned_user_id,
      cropCycleId: task.crop_cycle_id,
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
      scheduleState: scheduleStateForToday(task.scheduled_for, now),
    })),
    meta: { count: rows.length },
  });
}
