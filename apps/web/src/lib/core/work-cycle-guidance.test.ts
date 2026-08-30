import { describe, expect, it } from "vitest";

import { getWorkCycleGuidance } from "@/lib/core/work-cycle-guidance";

const baseInput = {
  canCreateFarm: true,
  canManageFarm: true,
  cropCycleStatus: "active" as const,
  hasAvailableFarm: false,
  hasFarm: true,
  hasScheduledTasks: true,
  overdueTaskCount: 0,
  todayTaskCount: 0,
};

describe("work cycle guidance", () => {
  it("guides an owner without a Farm to Farm registration", () => {
    expect(getWorkCycleGuidance({ ...baseInput, hasFarm: false })).toMatchObject({
      actionLabel: "농장 등록하기",
      targetId: "farm-heading",
    });
  });

  it("guides a shared Farm member without creation permission to Farm selection", () => {
    expect(
      getWorkCycleGuidance({ ...baseInput, canCreateFarm: false, hasFarm: false }),
    ).toMatchObject({
      actionLabel: "공유 농장 선택하기",
      targetId: "saved-context-heading",
    });
  });

  it("guides an owner with saved Farms to selection instead of another Farm registration", () => {
    expect(
      getWorkCycleGuidance({ ...baseInput, hasAvailableFarm: true, hasFarm: false }),
    ).toMatchObject({
      actionLabel: "농장 선택하기",
      targetId: "saved-context-heading",
    });
  });

  it("guides a Farm manager without a selected CropCycle to its setup", () => {
    expect(getWorkCycleGuidance({ ...baseInput, cropCycleStatus: null })).toMatchObject({
      actionLabel: "작기 등록 또는 선택",
      targetId: "cycle-heading",
    });
  });

  it("guides a manager without planned work to TaskTemplate application", () => {
    expect(getWorkCycleGuidance({ ...baseInput, hasScheduledTasks: false })).toMatchObject({
      actionLabel: "작기 계획 만들기",
      targetId: "plan-heading",
    });
  });

  it("prioritizes overdue work over today's work", () => {
    expect(
      getWorkCycleGuidance({ ...baseInput, overdueTaskCount: 2, todayTaskCount: 1 }),
    ).toMatchObject({
      targetId: "today-heading",
      title: "지연된 작업부터 확인하세요",
      tone: "warning",
    });
  });

  it("guides an ended CropCycle to history", () => {
    expect(
      getWorkCycleGuidance({ ...baseInput, cropCycleStatus: "completed" }),
    ).toMatchObject({
      actionLabel: "작기 이력 보기",
      targetId: "history-heading",
    });
  });
});
