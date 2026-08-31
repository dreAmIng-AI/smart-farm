import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { toOfficialNongsaroAttachmentUrl } from "@/lib/integrations/nongsaro-disease-pest";

type RouteContext = { params: Promise<{ farmId: string }> };

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function isPdfResponse(response: Response, bytes: Uint8Array) {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  return contentType.includes("application/pdf") || (
    bytes.length >= 5 &&
    bytes[0] === 0x25 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x44 &&
    bytes[3] === 0x46 &&
    bytes[4] === 0x2d
  );
}

export async function GET(request: Request, context: RouteContext) {
  const { farmId } = await context.params;
  if (!isUuid(farmId)) {
    return errorResponse("VALIDATION_ERROR", "farmId must be a UUID.", 400);
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) return auth.response;

  const { data: farmData, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();
  if (farmError) return errorResponse("FARM_LOOKUP_FAILED", farmError.message, 400);
  if (!farmData) return errorResponse("FARM_NOT_FOUND", "Farm not found or not accessible.", 404);

  const attachment = toOfficialNongsaroAttachmentUrl(new URL(request.url).searchParams.get("attachment"));
  if (!attachment) {
    return errorResponse("INVALID_ATTACHMENT", "공식 병해충 원문 주소가 아닙니다.", 400);
  }

  try {
    const response = await fetch(attachment, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
    const finalUrl = toOfficialNongsaroAttachmentUrl(response.url || attachment);
    if (!response.ok || !finalUrl) {
      return errorResponse("DOCUMENT_UNAVAILABLE", "공식 원문을 지금 열지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
      return errorResponse("DOCUMENT_TOO_LARGE", "공식 원문 파일이 너무 커서 서비스 안에서 열 수 없습니다.", 413);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_DOCUMENT_BYTES || !isPdfResponse(response, bytes)) {
      return errorResponse("DOCUMENT_UNAVAILABLE", "공식 원문 파일을 안전하게 확인하지 못했습니다.", 502);
    }

    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": 'inline; filename="nongsaro-disease-pest.pdf"',
        "Content-Type": "application/pdf",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return errorResponse("DOCUMENT_UNAVAILABLE", "공식 원문을 지금 열지 못했습니다. 잠시 후 다시 시도해 주세요.", 502);
  }
}
