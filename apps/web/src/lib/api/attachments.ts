import type { AuthenticatedSupabaseContext } from "@/lib/api/auth";
import type { AttachmentFileInput } from "@/lib/api/validation";

export const ATTACHMENT_BUCKET = "farm-attachments";

type AttachmentTarget =
  | { kind: "action_log"; id: string }
  | { kind: "issue_record"; id: string };

type TargetRow = {
  action_log_id?: string;
  farm_task_id: string;
  id: string;
};

type FarmTaskRow = {
  farm_id: string;
  id: string;
};

export class AttachmentRequestError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function findTarget(
  auth: AuthenticatedSupabaseContext,
  target: AttachmentTarget,
): Promise<TargetRow> {
  const notFoundCode = target.kind === "action_log" ? "ACTION_LOG_NOT_FOUND" : "ISSUE_NOT_FOUND";
  const notFoundMessage =
    target.kind === "action_log"
      ? "Action log not found or not accessible."
      : "Issue record not found or not accessible.";

  const result =
    target.kind === "action_log"
      ? await auth.supabase.from("action_logs").select("id, farm_task_id").eq("id", target.id).maybeSingle()
      : await auth.supabase
          .from("issue_records")
          .select("id, farm_task_id, action_log_id")
          .eq("id", target.id)
          .maybeSingle();
  const { data, error } = result;

  if (error) {
    throw new AttachmentRequestError("ATTACHMENT_LOOKUP_FAILED", 400, error.message);
  }

  if (!data) {
    throw new AttachmentRequestError(notFoundCode, 404, notFoundMessage);
  }

  return data as unknown as TargetRow;
}

async function findFarmTask(
  auth: AuthenticatedSupabaseContext,
  farmTaskId: string,
): Promise<FarmTaskRow> {
  const { data, error } = await auth.supabase
    .from("farm_tasks")
    .select("id, farm_id")
    .eq("id", farmTaskId)
    .maybeSingle();

  if (error) {
    throw new AttachmentRequestError("ATTACHMENT_LOOKUP_FAILED", 400, error.message);
  }

  if (!data) {
    throw new AttachmentRequestError(
      "ATTACHMENT_LOOKUP_FAILED",
      404,
      "Farm task for the attachment was not found or not accessible.",
    );
  }

  return data as FarmTaskRow;
}

export async function uploadAttachment({
  auth,
  file,
  fileInput,
  target,
}: {
  auth: AuthenticatedSupabaseContext;
  file: File;
  fileInput: AttachmentFileInput;
  target: AttachmentTarget;
}) {
  const targetRow = await findTarget(auth, target);
  const farmTask = await findFarmTask(auth, targetRow.farm_task_id);
  const id = crypto.randomUUID();
  const actionLogId = target.kind === "action_log" ? target.id : targetRow.action_log_id;
  if (!actionLogId) {
    throw new AttachmentRequestError(
      "ATTACHMENT_LOOKUP_FAILED",
      400,
      "Issue record is missing its linked action log.",
    );
  }
  const storagePath = `${farmTask.farm_id}/${actionLogId}/${id}.${fileInput.extension}`;

  const { error: storageError } = await auth.supabase.storage
    .from(ATTACHMENT_BUCKET)
    .upload(storagePath, file, { contentType: fileInput.mimeType, upsert: false });

  if (storageError) {
    throw new AttachmentRequestError("STORAGE_UPLOAD_FAILED", 400, storageError.message);
  }

  const { error: attachmentError } = await auth.supabase.from("attachments").insert({
    action_log_id: target.kind === "action_log" ? target.id : null,
    file_size_bytes: fileInput.fileSizeBytes,
    id,
    issue_record_id: target.kind === "issue_record" ? target.id : null,
    mime_type: fileInput.mimeType,
    storage_path: storagePath,
  });

  if (attachmentError) {
    await auth.supabase.storage.from(ATTACHMENT_BUCKET).remove([storagePath]);
    throw new AttachmentRequestError("ATTACHMENT_CREATE_FAILED", 400, attachmentError.message);
  }

  return {
    id,
    actionLogId: target.kind === "action_log" ? target.id : null,
    issueRecordId: target.kind === "issue_record" ? target.id : null,
    storagePath,
    mimeType: fileInput.mimeType,
    fileSizeBytes: fileInput.fileSizeBytes,
    capturedAt: null,
  };
}
