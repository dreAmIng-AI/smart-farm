import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseFarmTaskStatusInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ taskId: string }> };

type FarmTaskRow = {
  assigned_user_id: string | null;
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

const taskSelect =
  "id, farm_id, crop_cycle_id, task_template_id, parent_issue_id, assigned_user_id, title, task_type, reason, priority, scheduled_for, due_at, evidence, verification_status, source_type, status, result_required, completed_at, created_at";

function taskResponse(task: FarmTaskRow) {
  return {
    id: task.id,
    assignedUserId: task.assigned_user_id,
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
  };
}

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
    .select(taskSelect)
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

  return NextResponse.json(taskResponse(data as FarmTaskRow));
}

export async function PATCH(request: Request, context: RouteContext) {
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

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmTaskStatusInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: existing, error: lookupError } = await auth.supabase
    .from("farm_tasks")
    .select("id, farm_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "TASK_LOOKUP_FAILED", message: lookupError.message } },
      { status: 400 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: { code: "TASK_NOT_FOUND", message: "Farm task not found or not accessible." } },
      { status: 404 },
    );
  }

  const authorization = await requireFarmManager(auth, existing.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  if (existing.status !== "pending") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Only a pending FarmTask can be cancelled: ${existing.status}.`,
        },
      },
      { status: 409 },
    );
  }

  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .update({ status: parsed.data.status })
    .eq("id", taskId)
    .eq("status", "pending")
    .select(taskSelect)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: { code: "TASK_CANCEL_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  if (!data) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: "Farm task is no longer pending.",
        },
      },
      { status: 409 },
    );
  }

  return NextResponse.json(taskResponse(data as FarmTaskRow));
}
