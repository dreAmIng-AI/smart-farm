import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ taskId: string }> };

type FarmTaskRow = {
  id: string;
  farm_id: string;
  crop_cycle_id: string;
  task_template_id: string | null;
  parent_issue_id: string | null;
  title: string;
  task_type: string;
  reason: string;
  priority: "low" | "medium" | "high";
  scheduled_for: string;
  due_at: string | null;
  evidence: unknown[];
  verification_status: string;
  source_type: string;
  status: string;
  result_required: boolean;
  completed_at: string | null;
  created_at: string;
};

export async function GET(_request: Request, context: RouteContext) {
  const { taskId } = await context.params;
  if (!isUuid(taskId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "taskId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .select(
      "id, farm_id, crop_cycle_id, task_template_id, parent_issue_id, title, task_type, reason, priority, scheduled_for, due_at, evidence, verification_status, source_type, status, result_required, completed_at, created_at",
    )
    .eq("id", taskId)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "TASK_LOOKUP_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      { error: { code: "TASK_NOT_FOUND", message: "Farm task not found or not accessible." } },
      { status: 404 },
    );
  }

  const task = data as FarmTaskRow;
  return NextResponse.json({
    id: task.id,
    farmId: task.farm_id,
    cropCycleId: task.crop_cycle_id,
    taskTemplateId: task.task_template_id,
    parentIssueId: task.parent_issue_id,
    title: task.title,
    taskType: task.task_type,
    reason: task.reason,
    priority: task.priority,
    scheduledFor: task.scheduled_for,
    dueAt: task.due_at,
    evidence: task.evidence,
    verificationStatus: task.verification_status,
    sourceType: task.source_type,
    status: task.status,
    resultRequired: task.result_required,
    completedAt: task.completed_at,
    createdAt: task.created_at,
  });
}
