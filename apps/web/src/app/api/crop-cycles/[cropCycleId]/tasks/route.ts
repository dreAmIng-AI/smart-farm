import { NextResponse } from "next/server";

import {
  requireAuthenticatedSupabaseUser,
  requireFarmManager,
  type AuthenticatedSupabaseContext,
} from "@/lib/api/auth";
import { isUuid, parseManualFarmTaskInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ cropCycleId: string }> };

type CropCycleRow = {
  farm_id: string;
  id: string;
  status: "active" | "completed" | "cancelled";
};

type FarmTaskRow = {
  assigned_user_id: string | null;
  evidence: unknown[];
  farm_area_id: string | null;
  id: string;
  parent_issue_id: string | null;
  priority: "low" | "medium" | "high";
  reason: string;
  result_required: boolean;
  scheduled_for: string;
  source_type: "template" | "manual" | "issue_followup";
  status: "pending" | "in_progress" | "completed" | "issue_reported" | "cancelled";
  task_type: string;
  title: string;
  verification_status: string;
};

async function validateFarmArea(
  auth: AuthenticatedSupabaseContext,
  farmId: string,
  farmAreaId: string | null,
) {
  if (!farmAreaId) return { ok: true as const };
  const { data, error } = await auth.supabase
    .from("farm_areas")
    .select("id, farm_id")
    .eq("id", farmAreaId)
    .maybeSingle();
  if (error) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_AREA_LOOKUP_FAILED", message: error.message } },
        { status: 400 },
      ),
    };
  }
  if (!data || data.farm_id !== farmId) {
    return {
      ok: false as const,
      response: NextResponse.json(
        { error: { code: "FARM_AREA_NOT_FOUND", message: "FarmArea was not found in this Farm." } },
        { status: 404 },
      ),
    };
  }
  return { ok: true as const };
}

function seoulStartOfDay(value: string) {
  return new Date(`${value}T00:00:00.000+09:00`).toISOString();
}

function taskResponse(task: FarmTaskRow) {
  return {
    id: task.id,
    assignedUserId: task.assigned_user_id,
    farmAreaId: task.farm_area_id,
    parentIssueId: task.parent_issue_id,
    title: task.title,
    taskType: task.task_type,
    reason: task.reason,
    priority: task.priority,
    scheduledFor: task.scheduled_for,
    evidence: task.evidence,
    verificationStatus: task.verification_status,
    sourceType: task.source_type,
    status: task.status,
    resultRequired: task.result_required,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const { cropCycleId } = await context.params;
  if (!isUuid(cropCycleId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "cropCycleId must be a UUID." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseManualFarmTaskInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data: cropCycle, error: cropCycleError } = await auth.supabase
    .from("crop_cycles")
    .select("id, farm_id, status")
    .eq("id", cropCycleId)
    .maybeSingle();

  if (cropCycleError) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_LOOKUP_FAILED", message: cropCycleError.message } },
      { status: 400 },
    );
  }

  if (!cropCycle) {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_NOT_FOUND", message: "Crop cycle not found or not accessible." } },
      { status: 404 },
    );
  }

  const cropCycleRow = cropCycle as CropCycleRow;
  if (cropCycleRow.status !== "active") {
    return NextResponse.json(
      { error: { code: "CROP_CYCLE_NOT_ACTIVE", message: "Crop cycle must be active to add a task." } },
      { status: 409 },
    );
  }

  const authorization = await requireFarmManager(auth, cropCycleRow.farm_id);
  if (!authorization.ok) {
    return authorization.response;
  }

  const farmArea = await validateFarmArea(auth, cropCycleRow.farm_id, parsed.data.farmAreaId);
  if (!farmArea.ok) {
    return farmArea.response;
  }

  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .insert({
      crop_cycle_id: cropCycleRow.id,
      evidence: [],
      farm_id: cropCycleRow.farm_id,
      farm_area_id: parsed.data.farmAreaId,
      priority: parsed.data.priority,
      reason: parsed.data.reason,
      result_required: true,
      scheduled_for: seoulStartOfDay(parsed.data.scheduledFor),
      source_type: "manual",
      status: "pending",
      task_template_id: null,
      task_type: "manual",
      title: parsed.data.title,
      verification_status: "draft",
    })
    .select(
      "id, parent_issue_id, assigned_user_id, farm_area_id, title, task_type, reason, priority, scheduled_for, evidence, verification_status, source_type, status, result_required",
    )
    .single();

  if (error || !data) {
    return NextResponse.json(
      {
        error: {
          code: "MANUAL_TASK_CREATE_FAILED",
          message: error?.message ?? "Manual FarmTask was not created.",
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ farmTask: taskResponse(data as FarmTaskRow) }, { status: 201 });
}
