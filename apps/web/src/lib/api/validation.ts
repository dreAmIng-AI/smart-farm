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

export type ActionLogInput = {
  actionType: "completed" | "not_checked";
  note: string | null;
  performedAt: string | null;
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

function isIsoDate(value: string): boolean {
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

export function parseActionLogInput(value: unknown): Parsed<ActionLogInput> {
  if (!isRecord(value)) {
    return { ok: false, error: "Request body must be a JSON object." };
  }

  const actionType = value.actionType;
  if (actionType !== "completed" && actionType !== "not_checked") {
    return {
      ok: false,
      error: "actionType must be completed or not_checked.",
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

  return { ok: true, data: { actionType, note, performedAt } };
}

export function isUuid(value: string | undefined): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}
