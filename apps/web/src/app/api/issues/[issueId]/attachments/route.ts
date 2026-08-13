import { NextResponse } from "next/server";

import { AttachmentRequestError, uploadAttachment } from "@/lib/api/attachments";
import { requireAuthenticatedSupabaseUser } from "@/lib/api/auth";
import { isUuid, parseAttachmentFile } from "@/lib/api/validation";

type RouteContext = { params: Promise<{ issueId: string }> };

export async function POST(request: Request, context: RouteContext) {
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

  const formData = await request.formData().catch(() => null);
  const parsed = await parseAttachmentFile(formData?.get("file"));
  if (!parsed.ok) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: parsed.error } },
      { status: 400 },
    );
  }

  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "file is required." } },
      { status: 400 },
    );
  }

  try {
    const attachment = await uploadAttachment({
      auth,
      file,
      fileInput: parsed.data,
      target: { kind: "issue_record", id: issueId },
    });
    return NextResponse.json({ attachment }, { status: 201 });
  } catch (error) {
    if (error instanceof AttachmentRequestError) {
      return NextResponse.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status },
      );
    }
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Attachment could not be uploaded." } },
      { status: 500 },
    );
  }
}
