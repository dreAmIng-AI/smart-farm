import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type FarmTaskRow = {
  id: string;
  title: string;
  source_type: string;
  status: string;
  scheduled_for: string;
  created_at: string;
  parent_issue_id: string | null;
};

type ActionLogRow = {
  id: string;
  farm_task_id: string;
  action_type: string;
  result_code: string | null;
  note: string | null;
  performed_at: string;
};

type IssueRow = {
  id: string;
  action_log_id: string;
  farm_task_id: string;
  observed_symptom: string;
  severity: string;
  status: string;
  expert_review_required: boolean;
  created_at: string;
};

type HistoryItem =
  | {
      id: string;
      kind: "action_log";
      occurredAt: string;
      farmTaskId: string;
      taskTitle: string;
      actionType: string;
      resultCode: string | null;
      note: string | null;
    }
  | {
      id: string;
      kind: "issue";
      occurredAt: string;
      issueId: string;
      actionLogId: string;
      farmTaskId: string;
      taskTitle: string;
      observedSymptom: string;
      severity: string;
      status: string;
      expertReviewRequired: boolean;
    }
  | {
      id: string;
      kind: "follow_up_task";
      occurredAt: string;
      farmTaskId: string;
      taskTitle: string;
      parentIssueId: string;
      status: string;
      scheduledFor: string;
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

  const { data: taskData, error: taskError } = await auth.supabase
    .from("farm_tasks")
    .select("id, title, source_type, status, scheduled_for, created_at, parent_issue_id")
    .eq("farm_id", farmId);

  if (taskError) {
    return NextResponse.json(
      { error: { code: "HISTORY_LOOKUP_FAILED", message: taskError.message } },
      { status: 400 },
    );
  }

  const tasks = (taskData ?? []) as FarmTaskRow[];
  if (tasks.length === 0) {
    return NextResponse.json({ items: [], meta: { count: 0 } });
  }

  const taskIds = tasks.map((task) => task.id);
  const [actionLogResult, issueResult] = await Promise.all([
    auth.supabase
      .from("action_logs")
      .select("id, farm_task_id, action_type, result_code, note, performed_at")
      .in("farm_task_id", taskIds),
    auth.supabase
      .from("issue_records")
      .select(
        "id, action_log_id, farm_task_id, observed_symptom, severity, status, expert_review_required, created_at",
      )
      .in("farm_task_id", taskIds),
  ]);

  if (actionLogResult.error || issueResult.error) {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_LOOKUP_FAILED",
          message: actionLogResult.error?.message ?? issueResult.error?.message ?? "History lookup failed.",
        },
      },
      { status: 400 },
    );
  }

  const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));
  const actionLogs = (actionLogResult.data ?? []) as ActionLogRow[];
  const issues = (issueResult.data ?? []) as IssueRow[];
  const followUps = tasks.filter(
    (task): task is FarmTaskRow & { parent_issue_id: string } =>
      task.source_type === "issue_followup" && task.parent_issue_id !== null,
  );

  const items: HistoryItem[] = [
    ...actionLogs.map((log) => ({
      id: `action:${log.id}`,
      kind: "action_log" as const,
      occurredAt: log.performed_at,
      farmTaskId: log.farm_task_id,
      taskTitle: taskTitleById.get(log.farm_task_id) ?? "FarmTask",
      actionType: log.action_type,
      resultCode: log.result_code,
      note: log.note,
    })),
    ...issues.map((issue) => ({
      id: `issue:${issue.id}`,
      kind: "issue" as const,
      occurredAt: issue.created_at,
      issueId: issue.id,
      actionLogId: issue.action_log_id,
      farmTaskId: issue.farm_task_id,
      taskTitle: taskTitleById.get(issue.farm_task_id) ?? "FarmTask",
      observedSymptom: issue.observed_symptom,
      severity: issue.severity,
      status: issue.status,
      expertReviewRequired: issue.expert_review_required,
    })),
    ...followUps.map((task) => ({
      id: `follow-up:${task.id}`,
      kind: "follow_up_task" as const,
      occurredAt: task.created_at,
      farmTaskId: task.id,
      taskTitle: task.title,
      parentIssueId: task.parent_issue_id,
      status: task.status,
      scheduledFor: task.scheduled_for,
    })),
  ].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt));

  return NextResponse.json({ items, meta: { count: items.length } });
}
