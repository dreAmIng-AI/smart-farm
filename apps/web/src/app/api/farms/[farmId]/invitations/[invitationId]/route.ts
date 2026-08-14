import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string; invitationId: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  const { farmId, invitationId } = await context.params;
  if (!isUuid(farmId) || !isUuid(invitationId)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "farmId and invitationId must be UUIDs." } },
      { status: 400 },
    );
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { data: invitation, error: lookupError } = await auth.supabase
    .from("farm_invitations")
    .select("id, farm_id")
    .eq("id", invitationId)
    .eq("farm_id", farmId)
    .maybeSingle();

  if (lookupError || !invitation) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_INVITATION_NOT_FOUND",
          message: lookupError?.message ?? "Farm invitation not found or not accessible.",
        },
      },
      { status: 404 },
    );
  }

  const { error } = await auth.supabase.rpc("revoke_farm_invitation", {
    p_invitation_id: invitationId,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_INVITATION_REVOKE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
