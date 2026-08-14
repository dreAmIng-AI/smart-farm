import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string }> };

type FarmCollaboration = {
  actorRole: "owner" | "admin" | "farmer";
  invitations: Array<{
    id: string;
    email: string;
    role: "admin" | "farmer";
    status: "pending";
    expiresAt: string;
    createdAt: string;
  }>;
  members: Array<{
    userId: string;
    email: string;
    role: "owner" | "admin" | "farmer";
    createdAt: string;
  }>;
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

  const { data, error } = await auth.supabase.rpc("get_farm_collaboration", {
    p_farm_id: farmId,
  });

  if (error || !data) {
    return NextResponse.json(
      {
        error: {
          code: "FARM_COLLABORATION_LOOKUP_FAILED",
          message: error?.message ?? "Farm collaboration could not be loaded.",
        },
      },
      { status: 400 },
    );
  }

  return NextResponse.json(data as FarmCollaboration);
}
