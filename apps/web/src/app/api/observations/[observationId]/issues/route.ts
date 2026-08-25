import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseObservationIssueInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ observationId: string }> };

type CreatedIssueRow = {
  issue_id: string;
  issue_status: "open" | "needs_review" | "resolved" | "closed_without_action";
};

export async function POST(request: Request, context: RouteContext) {
  const { observationId } = await context.params;
  if (!isUuid(observationId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "observationId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseObservationIssueInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: observation, error: observationError } = await auth.supabase
    .from("observations")
    .select("id, content")
    .eq("id", observationId)
    .maybeSingle();
  if (observationError) {
    return NextResponse.json(
      { error: { code: "OBSERVATION_LOOKUP_FAILED", message: observationError.message } },
      { status: 400 },
    );
  }
  if (!observation) {
    return NextResponse.json(
      { error: { code: "OBSERVATION_NOT_FOUND", message: "Observation not found or not accessible." } },
      { status: 404 },
    );
  }

  const { data, error } = await auth.supabase.rpc("create_observation_issue", {
    p_observation_id: observationId,
    p_severity: parsed.data.severity,
    p_expert_review_required: parsed.data.expertReviewRequired,
  });
  if (error) {
    const isDuplicate = error.code === "23505";
    return NextResponse.json(
      {
        error: {
          code: isDuplicate ? "OBSERVATION_ALREADY_HAS_ISSUE" : "ISSUE_RECORD_FAILED",
          message: isDuplicate
            ? "This Observation is already recorded as an Issue."
            : error.message,
        },
      },
      { status: isDuplicate ? 409 : 400 },
    );
  }

  const created = (data as CreatedIssueRow[] | null)?.[0];
  if (!created) {
    return NextResponse.json(
      { error: { code: "ISSUE_RECORD_FAILED", message: "Issue record was not created." } },
      { status: 500 },
    );
  }

  return NextResponse.json(
    {
      issue: {
        id: created.issue_id,
        observationId,
        observedSymptom: observation.content,
        severity: parsed.data.severity,
        status: created.issue_status,
        expertReviewRequired: parsed.data.expertReviewRequired,
      },
    },
    { status: 201 },
  );
}
