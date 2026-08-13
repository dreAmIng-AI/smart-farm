import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseActionLogInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ taskId: string }> };

type FarmTaskRow = {
  id: string;
  status: "pending" | "in_progress" | "completed" | "issue_reported" | "cancelled";
};

type RecordedActionRow = {
  action_log_id: string;
  task_status: FarmTaskRow["status"];
  completed_at: string | null;
};

export async function POST(request: Request, context: RouteContext) {
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
  const parsed = parseActionLogInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: task, error: taskError } = await auth.supabase
    .from("farm_tasks")
    .select("id, status")
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

  const taskRow = task as FarmTaskRow;
  if (taskRow.status !== "pending" && taskRow.status !== "in_progress") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Farm task cannot record another result from status: ${taskRow.status}.`,
        },
      },
      { status: 409 },
    );
  }

  const performedAt = parsed.data.performedAt ?? new Date().toISOString();
  const { data, error } = await auth.supabase.rpc("record_farm_task_action", {
    p_task_id: taskId,
    p_action_type: parsed.data.actionType,
    p_note: parsed.data.note ?? "",
    p_performed_at: performedAt,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "ACTION_LOG_RECORD_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const recorded = (data as RecordedActionRow[] | null)?.[0];
  if (!recorded) {
    return NextResponse.json(
      {
        error: {
          code: "ACTION_LOG_RECORD_FAILED",
          message: "Task result was not recorded.",
        },
      },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      actionLog: {
        id: recorded.action_log_id,
        actionType: parsed.data.actionType,
        resultCode: parsed.data.actionType,
        note: parsed.data.note,
        performedAt,
      },
      task: {
        id: taskId,
        status: recorded.task_status,
        completedAt: recorded.completed_at,
      },
    },
    { status: 201 },
  );
}
