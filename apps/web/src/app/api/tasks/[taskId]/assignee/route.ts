import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser, requireFarmManager } from "@/lib/api/auth";
import { isUuid, parseFarmTaskAssigneeInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ taskId: string }> };

type FarmTaskLookupRow = {
  farm_id: string;
  id: string;
  status: "pending" | "in_progress" | "completed" | "issue_reported" | "cancelled";
};

type AssignedTaskRow = {
  assigned_user_id: string | null;
  task_id: string;
};

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
  const parsed = parseFarmTaskAssigneeInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: task, error: taskError } = await auth.supabase
    .from("farm_tasks")
    .select("id, farm_id, status")
    .eq("id", taskId)
    .maybeSingle();

  if (taskError) {
    return NextResponse.json(
      { error: { code: "TASK_LOOKUP_FAILED", message: taskError.message } },
      { status: 400 },
    );
  }

  if (!task) {
    return NextResponse.json(
      { error: { code: "TASK_NOT_FOUND", message: "Farm task not found or not accessible." } },
      { status: 404 },
    );
  }

  const taskRow = task as FarmTaskLookupRow;
  const authorization = await requireFarmManager(auth, taskRow.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  if (taskRow.status !== "pending" && taskRow.status !== "in_progress") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Farm task assignment is only available before completion: ${taskRow.status}.`,
        },
      },
      { status: 409 },
    );
  }

  const { data, error } = await auth.supabase.rpc("assign_farm_task", {
    p_task_id: taskId,
    p_assigned_user_id: parsed.data.assignedUserId,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "TASK_ASSIGNMENT_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const assigned = (data as AssignedTaskRow[] | null)?.[0];
  if (!assigned) {
    return NextResponse.json(
      {
        error: {
          code: "TASK_ASSIGNMENT_UPDATE_FAILED",
          message: "Farm task assignment was not updated.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    task: {
      id: assigned.task_id,
      assignedUserId: assigned.assigned_user_id,
    },
  });
}
