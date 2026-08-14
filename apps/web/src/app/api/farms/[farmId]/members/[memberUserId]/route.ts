import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseFarmMemberRoleInput } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ farmId: string; memberUserId: string }> };

function invalidRouteResponse() {
  return NextResponse.json(
    { error: { code: "VALIDATION_ERROR", message: "farmId and memberUserId must be UUIDs." } },
    { status: 400 },
  );
}

export async function PATCH(request: Request, context: RouteContext) {
  const { farmId, memberUserId } = await context.params;
  if (!isUuid(farmId) || !isUuid(memberUserId)) {
    return invalidRouteResponse();
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const payload: unknown = await request.json().catch(() => null);
  const parsed = parseFarmMemberRoleInput(payload);
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const { data, error } = await auth.supabase.rpc("update_farm_member_role", {
    p_farm_id: farmId,
    p_member_user_id: memberUserId,
    p_role: parsed.data.role,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_MEMBER_ROLE_UPDATE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  const member = (data as Array<{ role: "admin" | "farmer"; user_id: string }> | null)?.[0];
  return NextResponse.json({ userId: member?.user_id ?? memberUserId, role: member?.role ?? parsed.data.role });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { farmId, memberUserId } = await context.params;
  if (!isUuid(farmId) || !isUuid(memberUserId)) {
    return invalidRouteResponse();
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return auth.response;
  }

  const { error } = await auth.supabase.rpc("remove_farm_member", {
    p_farm_id: farmId,
    p_member_user_id: memberUserId,
  });

  if (error) {
    return NextResponse.json(
      { error: { code: "FARM_MEMBER_REMOVE_FAILED", message: error.message } },
      { status: 400 },
    );
  }

  return new NextResponse(null, { status: 204 });
}
