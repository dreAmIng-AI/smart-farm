import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseFarmInvitationInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type InvitationRpcRow = {
  email: string;
  expires_at: string;
  id: string;
  role: "admin" | "farmer";
  token: string;
};

export async function POST(request: Request, context: RouteContext) {
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

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmInvitationInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase.rpc("create_farm_invitation", {
    p_email: parsed.data.email,
    p_farm_id: farmId,
    p_role: parsed.data.role,
  });
  const invitation = (data as InvitationRpcRow[] | null)?.[0];

  if (error || !invitation) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_INVITATION_CREATE_FAILED",
          message: error?.message ?? "Farm invitation could not be created.",
        },
      },
      { status: 400 },
    );
  }

  const inviteUrl = new URL(`/?invite=${encodeURIComponent(invitation.token)}`, request.url).toString();

  return NextResponse.json(
    {
      id: invitation.id,
      email: invitation.email,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      inviteUrl,
    },
    { status: 201 },
  );
}
