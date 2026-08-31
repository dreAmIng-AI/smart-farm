export type SelectedContext = {
  cropCycleId: string | null;
  farmId: string;
};

export function selectedContextStorageKey(userId: string) {
  return `dreaming-smart-farm:selected-context:${userId}`;
}

export function parseSelectedContext(value: string | null): SelectedContext | null {
  if (!value) return null;

  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    const { cropCycleId, farmId } = parsed as Record<string, unknown>;
    if (typeof farmId !== "string" || farmId.length === 0) return null;
    if (cropCycleId !== null && typeof cropCycleId !== "string") return null;

    return { farmId, cropCycleId };
  } catch {
    return null;
  }
}
