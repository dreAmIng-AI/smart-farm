export type FarmSetupProgressInput = {
  canManageFarm: boolean;
  hasFarm: boolean;
  hasScheduledTasks: boolean;
  hasSelectedCropCycle: boolean;
};

export type FarmSetupProgressStep = {
  description: string;
  id: "farm-heading" | "cycle-heading" | "plan-heading";
  label: string;
  status: "complete" | "current" | "next";
};

export function getFarmSetupProgress({
  canManageFarm,
  hasFarm,
  hasScheduledTasks,
  hasSelectedCropCycle,
}: FarmSetupProgressInput): FarmSetupProgressStep[] {
  const canPreparePlan = canManageFarm && hasSelectedCropCycle;

  return [
    {
      id: "farm-heading",
      label: "농장 선택",
      description: hasFarm ? "현재 농장을 선택했습니다." : "관리할 농장을 선택하거나 새로 만드세요.",
      status: hasFarm ? "complete" : "current",
    },
    {
      id: "cycle-heading",
      label: "재배 작물",
      description: hasSelectedCropCycle ? "현재 작기를 선택했습니다." : canManageFarm ? "재배 중인 작물과 정식일을 입력하세요." : "공유된 작기를 선택해 주세요.",
      status: hasSelectedCropCycle ? "complete" : hasFarm ? "current" : "next",
    },
    {
      id: "plan-heading",
      label: "작업 계획",
      description: hasScheduledTasks
        ? "오늘 할 일과 전체 일정이 준비되었습니다."
        : canPreparePlan
          ? "초기 작업을 만들면 오늘 화면에서 바로 확인할 수 있습니다."
          : "관리자가 작업 계획을 준비하면 오늘 할 일을 확인할 수 있습니다.",
      status: hasScheduledTasks ? "complete" : hasSelectedCropCycle ? "current" : "next",
    },
  ];
}
