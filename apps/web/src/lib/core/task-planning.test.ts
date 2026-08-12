import { describe, expect, it } from "vitest";

import {
  farmTaskPlanKey,
  planFarmTasks,
} from "@/lib/core/task-planning";
import type { CropCycle, TaskTemplate } from "@/lib/core/types";

const templates: TaskTemplate[] = [
  {
    id: "template-generic",
    cropCode: "test_crop",
    cultivar: null,
    growthStage: null,
    taskType: "observation",
    title: "Generic task",
    reason: "A generic Draft Fixture",
    timing: { offsetDays: 1 },
    priority: "medium",
    evidence: [],
    verificationStatus: "draft",
  },
  {
    id: "template-variety",
    cropCode: "test_crop",
    cultivar: "test_variety",
    growthStage: null,
    taskType: "observation",
    title: "Variety task",
    reason: "A variety Draft Fixture",
    timing: { offsetDays: 0 },
    priority: "high",
    evidence: [],
    verificationStatus: "draft",
  },
  {
    id: "template-other-crop",
    cropCode: "another_crop",
    cultivar: null,
    growthStage: null,
    taskType: "observation",
    title: "Other crop task",
    reason: "Must not apply",
    timing: {},
    priority: "low",
    evidence: [],
    verificationStatus: "draft",
  },
];

const cropCycle: CropCycle = {
  id: "cycle-1",
  farmId: "farm-1",
  cropCode: "test_crop",
  cultivar: "test_variety",
  transplantDate: "2026-08-12",
};

describe("TaskTemplate plan generation", () => {
  it("creates tasks from matching Draft templates without crop-specific logic", () => {
    const tasks = planFarmTasks(cropCycle, templates);

    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.taskTemplateId)).toEqual([
      "template-variety",
      "template-generic",
    ]);
    expect(tasks[0]).toMatchObject({
      cropCycleId: "cycle-1",
      farmId: "farm-1",
      scheduledFor: "2026-08-12T00:00:00.000Z",
      sourceType: "template",
      verificationStatus: "draft",
    });
  });

  it("does not return a task that already exists in the plan", () => {
    const existing = new Set([
      farmTaskPlanKey("cycle-1", "template-variety", "2026-08-12T00:00:00.000Z"),
    ]);

    expect(planFarmTasks(cropCycle, templates, existing).map((task) => task.taskTemplateId)).toEqual([
      "template-generic",
    ]);
  });
});
