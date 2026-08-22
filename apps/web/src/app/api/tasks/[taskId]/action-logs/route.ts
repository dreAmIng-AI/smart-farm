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

type RecordedIssueRow = {
  action_log_id: string;
  issue_id: string;
  task_status: FarmTaskRow["status"];
  issue_status: "open" | "needs_review" | "resolved" | "closed_without_action";
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
  if (parsed.data.actionType === "started" && taskRow.status !== "pending") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: `Farm task can only start from pending status: ${taskRow.status}.`,
        },
      },
      { status: 409 },
    );
  }

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

  if (parsed.data.actionType === "issue_reported") {
    const { data, error } = await auth.supabase.rpc("record_farm_task_issue", {
      p_task_id: taskId,
      p_note: parsed.data.note ?? "",
      p_performed_at: performedAt,
      p_observed_symptom: parsed.data.issue?.observedSymptom,
      p_severity: parsed.data.issue?.severity,
      p_expert_review_required: parsed.data.issue?.expertReviewRequired,
    });

    if (error) {
      return NextResponse.json(
        { error: { code: "ISSUE_RECORD_FAILED", message: error.message } },
        { status: 400 },
      );
    }

    const recorded = (data as RecordedIssueRow[] | null)?.[0];
    if (!recorded || !parsed.data.issue) {
      return NextResponse.json(
        { error: { code: "ISSUE_RECORD_FAILED", message: "Issue record was not created." } },
        { status: 500 },
      );
    }

    return NextResponse.json(
      {
        actionLog: {
          id: recorded.action_log_id,
          actionType: "issue_reported",
          resultCode: "observed_issue",
          note: parsed.data.note,
          performedAt,
        },
        issue: {
          id: recorded.issue_id,
          observedSymptom: parsed.data.issue.observedSymptom,
          severity: parsed.data.issue.severity,
          status: recorded.issue_status,
          expertReviewRequired: parsed.data.issue.expertReviewRequired,
        },
        task: {
          id: taskId,
          status: recorded.task_status,
          completedAt: null,
        },
      },
      { status: 201 },
    );
  }

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
