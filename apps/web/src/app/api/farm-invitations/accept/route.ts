import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { parseFarmInvitationAcceptanceInput } from "@/lib/api/validation";

type InvitationAcceptanceRpcRow = {
  farm_id: string;
  role: "admin" | "farmer";
};

export async function POST(request: Request) {
  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmInvitationAcceptanceInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase.rpc("accept_farm_invitation", {
    p_token: parsed.data.token,
  });
  const accepted = (data as InvitationAcceptanceRpcRow[] | null)?.[0];

  if (error || !accepted) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_INVITATION_ACCEPT_FAILED",
          message: error?.message ?? "Farm invitation could not be accepted.",
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ farmId: accepted.farm_id, role: accepted.role });
}
