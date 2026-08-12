import type { CropCycle, PlannedFarmTask, TaskTemplate } from "@/lib/core/types";

export function templateAppliesToCropCycle(
  template: TaskTemplate,
  cropCycle: CropCycle,
): boolean {
  return (
    template.cropCode === cropCycle.cropCode &&
    (template.cultivar === null || template.cultivar === cropCycle.cultivar)
  );
}

export function addUtcDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString();
}

export function farmTaskPlanKey(
  cropCycleId: string,
  taskTemplateId: string,
  scheduledFor: string,
): string {
  return `${cropCycleId}:${taskTemplateId}:${scheduledFor}`;
}

export function planFarmTasks(
  cropCycle: CropCycle,
  templates: TaskTemplate[],
  existingPlanKeys: Set<string> = new Set(),
): PlannedFarmTask[] {
  return templates
    .filter((template) => templateAppliesToCropCycle(template, cropCycle))
    .map((template) => ({
      cropCycleId: cropCycle.id,
      farmId: cropCycle.farmId,
      taskTemplateId: template.id,
      title: template.title,
      taskType: template.taskType,
      reason: template.reason,
      priority: template.priority,
      scheduledFor: addUtcDays(
        cropCycle.transplantDate,
        template.timing.offsetDays ?? 0,
      ),
      evidence: template.evidence,
      verificationStatus: template.verificationStatus,
      sourceType: "template" as const,
      status: "pending" as const,
      resultRequired: true as const,
    }))
    .filter(
      (task) =>
        !existingPlanKeys.has(
          farmTaskPlanKey(
            task.cropCycleId,
            task.taskTemplateId,
            task.scheduledFor,
          ),
        ),
    )
    .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
}
