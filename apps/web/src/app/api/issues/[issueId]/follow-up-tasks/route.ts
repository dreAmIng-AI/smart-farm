import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseFollowUpTaskInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ issueId: string }> };

type IssueRow = {
  id: string;
  status: "open" | "needs_review" | "resolved" | "closed_without_action";
};

type CreatedFollowUpRow = {
  farm_task_id: string;
  task_status: "pending" | "in_progress" | "completed" | "issue_reported" | "cancelled";
  scheduled_for: string;
};

function seoulStartOfDay(value: string) {
  return new Date(`${value}T00:00:00.000+09:00`).toISOString();
}

export async function POST(request: Request, context: RouteContext) {
  const { issueId } = await context.params;
  if (!isUuid(issueId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "issueId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFollowUpTaskInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: issue, error: issueError } = await auth.supabase
    .from("issue_records")
    .select("id, status")
    .eq("id", issueId)
    .maybeSingle();

  if (issueError) {
    return NextResponse.json(
      { error: { code: "ISSUE_LOOKUP_FAILED", message: issueError.message } },
      { status: 400 },
    );
  }

  if (!issue) {
    return NextResponse.json(
      { error: { code: "ISSUE_NOT_FOUND", message: "Issue record not found or not accessible." } },
      { status: 404 },
    );
  }

  const issueRow = issue as IssueRow;
  if (issueRow.status !== "open" && issueRow.status !== "needs_review") {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_STATUS_TRANSITION",
          message: "Follow-up tasks can only be created for unresolved issues.",
        },
      },
      { status: 409 },
    );
  }

  const scheduledFor = seoulStartOfDay(parsed.data.scheduledFor);
  const { data, error } = await auth.supabase.rpc("create_issue_follow_up_task", {
    p_issue_id: issueId,
    p_title: parsed.data.title,
    p_scheduled_for: scheduledFor,
    p_priority: parsed.data.priority,
  });

  if (error) {
    const isDuplicate = error.code === "23505";
    return NextResponse.json(
      {
        error: {
          code: isDuplicate ? "DUPLICATE_FOLLOW_UP_TASK" : "FOLLOW_UP_TASK_CREATE_FAILED",
          message: isDuplicate
            ? "A follow-up task for this issue already exists on the selected date."
            : error.message,
        },
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }

  const created = (data as CreatedFollowUpRow[] | null)?.[0];
  if (!created) {
    return NextResponse.json(
      { error: { code: "FOLLOW_UP_TASK_CREATE_FAILED", message: "Follow-up task was not created." } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      farmTask: {
        id: created.farm_task_id,
        parentIssueId: issueId,
        title: parsed.data.title,
        priority: parsed.data.priority,
        scheduledFor: created.scheduled_for,
        sourceType: "issue_followup",
        status: created.task_status,
      },
    },
    { status: 201 },
  );
}
