import { NextResponse } from "next/server";

import { ATTACHMENT_BUCKET } from "@/lib/api/attachments";
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
  action_log_id: string | null;
  crop_cycle_id: string | null;
  farm_task_id: string | null;
  observation_id: string | null;
  observed_symptom: string;
  severity: string;
  status: string;
  expert_review_required: boolean;
  created_at: string;
};

type AttachmentRow = {
  action_log_id: string | null;
  captured_at: string | null;
  created_at: string;
  file_size_bytes: number;
  id: string;
  issue_record_id: string | null;
  mime_type: string;
  storage_path: string;
};

type HistoryAttachment = {
  capturedAt: string | null;
  createdAt: string;
  fileSizeBytes: number;
  id: string;
  mimeType: string;
  signedUrl: string | null;
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
      attachments: HistoryAttachment[];
    }
  | {
      id: string;
      kind: "issue";
      occurredAt: string;
      issueId: string;
      actionLogId: string | null;
      cropCycleId: string | null;
      farmTaskId: string | null;
      observationId: string | null;
      origin: "task" | "observation";
      taskTitle: string;
      observedSymptom: string;
      severity: string;
      status: string;
      expertReviewRequired: boolean;
      attachments: HistoryAttachment[];
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

  const [taskResult, observationResult] = await Promise.all([
    auth.supabase
      .from("farm_tasks")
      .select("id, title, source_type, status, scheduled_for, created_at, parent_issue_id")
      .eq("farm_id", farmId),
    auth.supabase
      .from("observations")
      .select("id")
      .eq("farm_id", farmId),
  ]);

  if (taskResult.error || observationResult.error) {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_LOOKUP_FAILED",
          message: taskResult.error?.message ?? observationResult.error?.message ?? "History lookup failed.",
        },
      },
      { status: 400 },
    );
  }

  const tasks = (taskResult.data ?? []) as FarmTaskRow[];
  const observations = (observationResult.data ?? []) as { id: string }[];
  const observationIds = observations.map((observation) => observation.id);
  if (tasks.length === 0 && observationIds.length === 0) {
    return NextResponse.json({ items: [], meta: { count: 0 } });
  }

  const taskIds = tasks.map((task) => task.id);
  const [actionLogResult, taskIssueResult, observationIssueResult] = await Promise.all([
    taskIds.length > 0
      ? auth.supabase
      .from("action_logs")
      .select("id, farm_task_id, action_type, result_code, note, performed_at")
          .in("farm_task_id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    taskIds.length > 0
      ? auth.supabase
      .from("issue_records")
      .select(
            "id, action_log_id, farm_task_id, observation_id, crop_cycle_id, observed_symptom, severity, status, expert_review_required, created_at",
      )
          .in("farm_task_id", taskIds)
      : Promise.resolve({ data: [], error: null }),
    observationIds.length > 0
      ? auth.supabase
          .from("issue_records")
          .select(
            "id, action_log_id, farm_task_id, observation_id, crop_cycle_id, observed_symptom, severity, status, expert_review_required, created_at",
          )
          .in("observation_id", observationIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (actionLogResult.error || taskIssueResult.error || observationIssueResult.error) {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_LOOKUP_FAILED",
          message:
            actionLogResult.error?.message ??
            taskIssueResult.error?.message ??
            observationIssueResult.error?.message ??
            "History lookup failed.",
        },
      },
      { status: 400 },
    );
  }

  const taskTitleById = new Map(tasks.map((task) => [task.id, task.title]));
  const actionLogs = (actionLogResult.data ?? []) as ActionLogRow[];
  const issueById = new Map<string, IssueRow>();
  [...((taskIssueResult.data ?? []) as IssueRow[]), ...((observationIssueResult.data ?? []) as IssueRow[])].forEach((issue) => {
    issueById.set(issue.id, issue);
  });
  const issues = [...issueById.values()];
  const actionLogIds = actionLogs.map((log) => log.id);
  const issueIds = issues.map((issue) => issue.id);
  const [actionAttachmentResult, issueAttachmentResult] = await Promise.all([
    actionLogIds.length > 0
      ? auth.supabase
          .from("attachments")
          .select("id, action_log_id, issue_record_id, storage_path, mime_type, file_size_bytes, captured_at, created_at")
          .in("action_log_id", actionLogIds)
      : Promise.resolve({ data: [], error: null }),
    issueIds.length > 0
      ? auth.supabase
          .from("attachments")
          .select("id, action_log_id, issue_record_id, storage_path, mime_type, file_size_bytes, captured_at, created_at")
          .in("issue_record_id", issueIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (actionAttachmentResult.error || issueAttachmentResult.error) {
    return NextResponse.json(
      {
        error: {
          code: "HISTORY_LOOKUP_FAILED",
          message:
            actionAttachmentResult.error?.message ??
            issueAttachmentResult.error?.message ??
            "Attachment history lookup failed.",
        },
      },
      { status: 400 },
    );
  }

  const attachmentRows = [
    ...((actionAttachmentResult.data ?? []) as AttachmentRow[]),
    ...((issueAttachmentResult.data ?? []) as AttachmentRow[]),
  ];
  const attachments = await Promise.all(
    attachmentRows.map(async (attachment) => {
      const { data, error } = await auth.supabase.storage
        .from(ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.storage_path, 60 * 60);

      return {
        capturedAt: attachment.captured_at,
        createdAt: attachment.created_at,
        fileSizeBytes: attachment.file_size_bytes,
        id: attachment.id,
        mimeType: attachment.mime_type,
        signedUrl: error ? null : (data?.signedUrl ?? null),
      } satisfies HistoryAttachment;
    }),
  );
  const actionAttachmentsById = new Map<string, HistoryAttachment[]>();
  const issueAttachmentsById = new Map<string, HistoryAttachment[]>();
  attachmentRows.forEach((attachment, index) => {
    const historyAttachment = attachments[index];
    if (attachment.action_log_id) {
      actionAttachmentsById.set(attachment.action_log_id, [
        ...(actionAttachmentsById.get(attachment.action_log_id) ?? []),
        historyAttachment,
      ]);
    }
    if (attachment.issue_record_id) {
      issueAttachmentsById.set(attachment.issue_record_id, [
        ...(issueAttachmentsById.get(attachment.issue_record_id) ?? []),
        historyAttachment,
      ]);
    }
  });
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
      attachments: actionAttachmentsById.get(log.id) ?? [],
    })),
    ...issues.map((issue) => ({
      id: `issue:${issue.id}`,
      kind: "issue" as const,
      occurredAt: issue.created_at,
      issueId: issue.id,
      actionLogId: issue.action_log_id,
      farmTaskId: issue.farm_task_id,
      observationId: issue.observation_id,
      cropCycleId: issue.crop_cycle_id,
      origin: issue.observation_id ? "observation" as const : "task" as const,
      taskTitle: issue.farm_task_id ? (taskTitleById.get(issue.farm_task_id) ?? "FarmTask") : "관찰 기록",
      observedSymptom: issue.observed_symptom,
      severity: issue.severity,
      status: issue.status,
      expertReviewRequired: issue.expert_review_required,
      attachments: issueAttachmentsById.get(issue.id) ?? [],
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
