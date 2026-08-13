import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseIssueStatusInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ issueId: string }> };

export async function PATCH(request: Request, context: RouteContext) {
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
  const parsed = parseIssueStatusInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: existing, error: lookupError } = await auth.supabase
    .from("issue_records")
    .select("id")
    .eq("id", issueId)
    .maybeSingle();

  if (lookupError) {
    return NextResponse.json(
      { error: { code: "ISSUE_LOOKUP_FAILED", message: lookupError.message } },
      { status: 400 },
    );
  }

  if (!existing) {
    return NextResponse.json(
      { error: { code: "ISSUE_NOT_FOUND", message: "Issue record not found or not accessible." } },
      { status: 404 },
    );
  }

  const resolvedAt = parsed.data.status === "resolved" ? new Date().toISOString() : null;
  const { data, error } = await auth.supabase
    .from("issue_records")
    .update({ status: parsed.data.status, resolved_at: resolvedAt })
    .eq("id", issueId)
    .select("id, status, resolved_at")
    .single();

  if (error) {
    return NextResponse.json(
      { error: { code: "ISSUE_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return NextResponse.json({
    issue: {
      id: data.id,
      status: data.status,
      resolvedAt: data.resolved_at,
    },
  });
}
