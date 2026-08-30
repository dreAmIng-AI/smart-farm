import { describe, expect, it } from "vitest";

import { getFarmSetupProgress } from "@/lib/core/farm-setup-progress";

describe("farm setup progress", () => {
  it("starts with farm selection for a new owner", () => {
    const steps = getFarmSetupProgress({
      canManageFarm: false,
      hasFarm: false,
      hasScheduledTasks: false,
      hasSelectedCropCycle: false,
    });

    expect(steps.map((step) => step.status)).toEqual(["current", "next", "next"]);
  });

  it("moves to cultivation setup after selecting a farm", () => {
    const steps = getFarmSetupProgress({
      canManageFarm: true,
      hasFarm: true,
      hasScheduledTasks: false,
      hasSelectedCropCycle: false,
    });

    expect(steps[0]).toMatchObject({ id: "farm-heading", status: "complete" });
    expect(steps[1]).toMatchObject({ id: "cycle-heading", status: "current" });
  });

  it("marks all three steps complete after a plan is available", () => {
    const steps = getFarmSetupProgress({
      canManageFarm: true,
      hasFarm: true,
      hasScheduledTasks: true,
      hasSelectedCropCycle: true,
    });

    expect(steps.map((step) => step.status)).toEqual(["complete", "complete", "complete"]);
  });
});
