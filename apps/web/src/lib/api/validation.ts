type Parsed<T> = { ok: true; data: T } | { ok: false; error: string };

export type FarmInput = {
  name: string;
  regionCode: string;
  cultivationEnvironment: "facility" | "open_field";
  cultivationMethod: string | null;
};

export type CropCycleInput = {
  cropCode: string;
  cultivar: string | null;
  transplantDate: string;
  growthStage: string | null;
};

export type CropCycleGrowthStageInput = {
  growthStage: string | null;
};

export type IssueSeverity = "low" | "medium" | "high" | "unknown";

export type IssueStatus = "open" | "needs_review" | "resolved" | "closed_without_action";

export type IssueStatusInput = {
  status: IssueStatus;
};

export type IssueInput = {
  observedSymptom: string;
  severity: IssueSeverity;
  expertReviewRequired: boolean;
};

export type ActionLogInput = {
  actionType: "completed" | "not_checked" | "issue_reported";
  note: string | null;
  performedAt: string | null;
  issue?: IssueInput;
};

export type FollowUpTaskInput = {
  title: string;
  scheduledFor: string;
  priority: "low" | "medium" | "high";
};

export type AttachmentFileInput = {
  extension: "jpg" | "png" | "webp";
  fileSizeBytes: number;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requiredText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function isIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  return new Date(`${value}T00:00:00.000Z`).toISOString().slice(0, 10) === value;
}

function isIsoDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) {
    return false;
  }

  return new Date(value).toISOString() === value;
}

export function parseFarmInput(value: unknown): Parsed<FarmInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const name = requiredText(value.name);
  const regionCode = requiredText(value.regionCode);
  const cultivationEnvironment = value.cultivationEnvironment;

  if (!name || !regionCode) {
    return { ok: false, error: "name and regionCode are required." };
  }

  if (cultivationEnvironment !== "facility" && cultivationEnvironment !== "open_field") {
    return {
      ok: false,
      error: "cultivationEnvironment must be facility or open_field.",
    };
  }

  return {
    ok: true,
    data: {
      name,
      regionCode,
      cultivationEnvironment,
      cultivationMethod: optionalText(value.cultivationMethod),
    },
  };
}

export function parseCropCycleInput(value: unknown): Parsed<CropCycleInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const cropCode = requiredText(value.cropCode);
  const transplantDate = requiredText(value.transplantDate);

  if (!cropCode || !transplantDate) {
    return { ok: false, error: "cropCode and transplantDate are required." };
  }

  if (!isIsoDate(transplantDate)) {
    return { ok: false, error: "transplantDate must be a valid YYYY-MM-DD date." };
  }

  return {
    ok: true,
    data: {
      cropCode,
      cultivar: optionalText(value.cultivar),
      transplantDate,
      growthStage: optionalText(value.growthStage),
    },
  };
}

export function parseCropCycleGrowthStageInput(
  value: unknown,
): Parsed<CropCycleGrowthStageInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  if (!("growthStage" in value)) {
    return { ok: false, error: "growthStage is required." };
  }

  if (value.growthStage !== null && typeof value.growthStage !== "string") {
    return { ok: false, error: "growthStage must be a string or null." };
  }

  const growthStage = optionalText(value.growthStage);
  if (growthStage && growthStage.length > 100) {
    return { ok: false, error: "growthStage must not exceed 100 characters." };
  }

  return { ok: true, data: { growthStage } };
}

export function parseIssueStatusInput(value: unknown): Parsed<IssueStatusInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const status = value.status;
  if (
    status !== "open" &&
    status !== "needs_review" &&
    status !== "resolved" &&
    status !== "closed_without_action"
  ) {
    return {
      ok: false,
      error: "status must be open, needs_review, resolved, or closed_without_action.",
    };
  }

  return { ok: true, data: { status } };
}

export function parseActionLogInput(value: unknown): Parsed<ActionLogInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const actionType = value.actionType;
  if (actionType !== "completed" && actionType !== "not_checked" && actionType !== "issue_reported") {
    return {
      ok: false,
      error: "actionType must be completed, not_checked, or issue_reported.",
    };
  }

  const note = optionalText(value.note);
  if (note && note.length > 1000) {
    return { ok: false, error: "note must not exceed 1000 characters." };
  }

  const performedAt = optionalText(value.performedAt);
  if (performedAt && !isIsoDateTime(performedAt)) {
    return {
      ok: false,
      error: "performedAt must be an ISO 8601 UTC timestamp.",
    };
  }

  if (actionType !== "issue_reported") {
    return { ok: true, data: { actionType, note, performedAt } };
  }

  if (!isRecord(value.issue)) {
    return {
      ok: false,
      error: "issue is required when actionType is issue_reported.",
    };
  }

  const observedSymptom = requiredText(value.issue.observedSymptom);
  const severity = value.issue.severity;
  const expertReviewRequired = value.issue.expertReviewRequired;

  if (!observedSymptom || observedSymptom.length > 1000) {
    return {
      ok: false,
      error: "issue.observedSymptom is required and must not exceed 1000 characters.",
    };
  }

  if (severity !== "low" && severity !== "medium" && severity !== "high" && severity !== "unknown") {
    return {
      ok: false,
      error: "issue.severity must be low, medium, high, or unknown.",
    };
  }

  if (typeof expertReviewRequired !== "boolean") {
    return {
      ok: false,
      error: "issue.expertReviewRequired must be a boolean.",
    };
  }

  return {
    ok: true,
    data: {
      actionType,
      note,
      performedAt,
      issue: { observedSymptom, severity, expertReviewRequired },
    },
  };
}

export function parseFollowUpTaskInput(value: unknown): Parsed<FollowUpTaskInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const title = requiredText(value.title);
  const scheduledFor = requiredText(value.scheduledFor);
  const priority = value.priority;

  if (!title || title.length > 200) {
    return { ok: false, error: "title is required and must not exceed 200 characters." };
  }

  if (!scheduledFor || !isIsoDate(scheduledFor)) {
    return { ok: false, error: "scheduledFor must be a valid YYYY-MM-DD date." };
  }

  if (priority !== "low" && priority !== "medium" && priority !== "high") {
    return { ok: false, error: "priority must be low, medium, or high." };
  }

  return { ok: true, data: { title, scheduledFor, priority } };
}

const attachmentTypes = {
  "image/jpeg": { extension: "jpg", matches: (bytes: Uint8Array) => bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff },
  "image/png": {
    extension: "png",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a,
  },
  "image/webp": {
    extension: "webp",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 12 &&
      bytes[0] === 0x52 &&
      bytes[1] === 0x49 &&
      bytes[2] === 0x46 &&
      bytes[3] === 0x46 &&
      bytes[8] === 0x57 &&
      bytes[9] === 0x45 &&
      bytes[10] === 0x42 &&
      bytes[11] === 0x50,
  },
} as const;

const MAX_ATTACHMENT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function parseAttachmentFile(value: unknown): Promise<Parsed<AttachmentFileInput>> {
  if (!(value instanceof File)) {
    return { ok: false, error: "file is required." };
  }

  if (value.size === 0 || value.size > MAX_ATTACHMENT_FILE_SIZE_BYTES) {
    return { ok: false, error: "file must be between 1 byte and 10 MB." };
  }

  const mimeType = value.type as AttachmentFileInput["mimeType"];
  const attachmentType = attachmentTypes[mimeType];
  if (!attachmentType) {
    return { ok: false, error: "file must be a JPEG, PNG, or WebP image." };
  }

  const bytes = new Uint8Array(await value.slice(0, 12).arrayBuffer());
  if (!attachmentType.matches(bytes)) {
    return { ok: false, error: "file contents do not match its image type." };
  }

  return {
    ok: true,
    data: {
      extension: attachmentType.extension,
      fileSizeBytes: value.size,
      mimeType,
    },
  };
}

export function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
