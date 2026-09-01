import { NextResponse } from "next/server";

import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid } from "@/lib/api/validation";
import { toOfficialNongsaroAttachmentUrl } from "@/lib/integrations/nongsaro-disease-pest";

type RouteContext = { params: Promise<{ farmId: string }> };

const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json({ error: { code, message } }, { status });
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

function embeddedDocumentError(message: string, status: number, officialAttachment: string | null) {
  const officialLink = officialAttachment
    ? `<a href="${escapeHtml(officialAttachment)}" rel="noreferrer" target="_blank">농사로에서 원문 열기</a>`
    : "";
  const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>공식 원문을 열 수 없습니다</title></head><body style="margin:0;padding:24px;font-family:system-ui,sans-serif;line-height:1.55;color:#172033;background:#fff"><h1 style="font-size:20px;margin:0 0 12px">공식 원문을 지금 서비스 안에서 보여드릴 수 없습니다.</h1><p style="margin:0 0 16px">${escapeHtml(message)}</p>${officialLink}</body></html>`;
  return new NextResponse(html, {
    status,
    headers: {
      "Cache-Control": "private, no-store",
      "Content-Type": "text/html; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function documentErrorResponse(request: Request, code: string, message: string, status: number, officialAttachment: string | null = null) {
  if (new URL(request.url).searchParams.get("view") === "embed") {
    return embeddedDocumentError(message, status, officialAttachment);
  }
  return errorResponse(code, message, status);
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
    return documentErrorResponse(request, "VALIDATION_ERROR", "원문을 열 정보를 확인하지 못했습니다. 목록에서 다시 선택해 주세요.", 400);
  }

  const auth = await requireAuthenticatedSupabaseUser();
  if (!auth.ok) {
    return new URL(request.url).searchParams.get("view") === "embed"
      ? embeddedDocumentError("로그인이 만료되었습니다. 다시 로그인한 뒤 원문을 열어 주세요.", 401, null)
      : auth.response;
  }

  const { data: farmData, error: farmError } = await auth.supabase
    .from("farms")
    .select("id")
    .eq("id", farmId)
    .maybeSingle();
  if (farmError) return documentErrorResponse(request, "FARM_LOOKUP_FAILED", "농장 접근 정보를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.", 400);
  if (!farmData) return documentErrorResponse(request, "FARM_NOT_FOUND", "이 농장의 원문을 열 권한이 없거나 농장을 찾지 못했습니다.", 404);

  const attachment = toOfficialNongsaroAttachmentUrl(new URL(request.url).searchParams.get("attachment"));
  if (!attachment) {
    return documentErrorResponse(request, "INVALID_ATTACHMENT", "공식 병해충 원문 주소를 확인하지 못했습니다. 목록을 새로 확인해 주세요.", 400);
  }

  try {
    const response = await fetch(attachment, { redirect: "follow", signal: AbortSignal.timeout(10_000) });
    const finalUrl = toOfficialNongsaroAttachmentUrl(response.url || attachment);
    if (!response.ok || !finalUrl) {
      return documentErrorResponse(request, "DOCUMENT_UNAVAILABLE", "자료 주소가 바뀌었거나 농사로 연결이 잠시 불안정할 수 있습니다. 아래에서 농사로 원문을 직접 열 수 있습니다.", 502, attachment);
    }

    const contentLength = Number(response.headers.get("content-length"));
    if (Number.isFinite(contentLength) && contentLength > MAX_DOCUMENT_BYTES) {
      return documentErrorResponse(request, "DOCUMENT_TOO_LARGE", "원문 파일이 커서 서비스 안에서 열 수 없습니다. 아래에서 농사로 원문을 직접 열어 주세요.", 413, attachment);
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    if (bytes.length > MAX_DOCUMENT_BYTES || !isPdfResponse(response, bytes)) {
      return documentErrorResponse(request, "DOCUMENT_UNAVAILABLE", "원문 파일 형식을 확인하지 못했습니다. 아래에서 농사로 원문을 직접 열 수 있습니다.", 502, attachment);
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
    return documentErrorResponse(request, "DOCUMENT_UNAVAILABLE", "농사로 원문을 지금 불러오지 못했습니다. 잠시 후 다시 시도하거나 아래에서 직접 열어 주세요.", 502, attachment);
  }
}
