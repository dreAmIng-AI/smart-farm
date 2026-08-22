export type WorkCycleGuidanceInput = {
  canCreateFarm: boolean;
  canManageFarm: boolean;
  cropCycleStatus: "active" | "completed" | "cancelled" | null;
  hasAvailableFarm: boolean;
  hasFarm: boolean;
  hasScheduledTasks: boolean;
  overdueTaskCount: number;
  todayTaskCount: number;
};

export type WorkCycleGuidance = {
  actionLabel: string;
  description: string;
  targetId: "farm-heading" | "saved-context-heading" | "cycle-heading" | "plan-heading" | "today-heading" | "schedule-heading" | "history-heading";
  title: string;
  tone: "default" | "warning";
};

export function getWorkCycleGuidance({
  canCreateFarm,
  canManageFarm,
  cropCycleStatus,
  hasAvailableFarm,
  hasFarm,
  hasScheduledTasks,
  overdueTaskCount,
  todayTaskCount,
}: WorkCycleGuidanceInput): WorkCycleGuidance {
  if (!hasFarm) {
    if (hasAvailableFarm) {
      return {
        actionLabel: "Farm 선택하기",
        description: "저장된 Farm을 선택하면 현재 작기와 Today 작업을 이어서 볼 수 있습니다.",
        targetId: "saved-context-heading",
        title: "작업할 Farm을 선택하세요",
        tone: "default",
      };
    }

    if (canCreateFarm) {
      return {
        actionLabel: "Farm 등록하기",
        description: "작업을 시작할 Farm의 기본정보를 먼저 등록하세요.",
        targetId: "farm-heading",
        title: "먼저 Farm을 등록하세요",
        tone: "default",
      };
    }

    return {
      actionLabel: "공유 Farm 선택하기",
      description: "초대받은 Farm을 선택하면 Today와 작업 이력을 이어서 볼 수 있습니다.",
      targetId: "saved-context-heading",
      title: "공유 Farm을 선택하세요",
      tone: "default",
    };
  }

  if (!cropCycleStatus) {
    return canManageFarm
      ? {
          actionLabel: "CropCycle 등록 또는 선택",
          description: "현재 Farm에서 관리할 작기를 선택하거나 새로 등록하세요.",
          targetId: "cycle-heading",
          title: "다음으로 작기를 정하세요",
          tone: "default",
        }
      : {
          actionLabel: "CropCycle 선택하기",
          description: "공유 Farm의 작기를 선택하면 오늘 해야 할 작업을 확인할 수 있습니다.",
          targetId: "saved-context-heading",
          title: "진행할 작기를 선택하세요",
          tone: "default",
        };
  }

  if (cropCycleStatus !== "active") {
    return {
      actionLabel: "작기 이력 보기",
      description: "종료된 작기는 새 계획을 만들지 않고 기존 작업과 기록을 계속 조회할 수 있습니다.",
      targetId: "history-heading",
      title: "이 작기는 종료되었습니다",
      tone: "default",
    };
  }

  if (!hasScheduledTasks) {
    return canManageFarm
      ? {
          actionLabel: "작기 계획 만들기",
          description: "Draft TaskTemplate을 적용해 작기 전체의 예정 작업을 먼저 만드세요.",
          targetId: "plan-heading",
          title: "작기 계획을 만들 차례입니다",
          tone: "default",
        }
      : {
          actionLabel: "작업 일정 확인",
          description: "아직 공유된 작기 계획이 없습니다. owner 또는 admin이 계획을 만들면 Today에 표시됩니다.",
          targetId: "plan-heading",
          title: "작기 계획을 기다리고 있습니다",
          tone: "default",
        };
  }

  if (overdueTaskCount > 0) {
    return {
      actionLabel: "지연 작업 확인하기",
      description: `오늘보다 이전에 예정된 작업이 ${overdueTaskCount}개 있습니다. 먼저 기록하거나 상태를 확인하세요.`,
      targetId: "today-heading",
      title: "지연된 작업부터 확인하세요",
      tone: "warning",
    };
  }

  if (todayTaskCount > 0) {
    return {
      actionLabel: "오늘 작업 기록하기",
      description: `오늘 실행할 작업이 ${todayTaskCount}개 있습니다. 완료 결과나 관찰한 문제를 남길 수 있습니다.`,
      targetId: "today-heading",
      title: "오늘 해야 할 작업이 있습니다",
      tone: "default",
    };
  }

  return {
    actionLabel: "다음 일정 보기",
    description: "오늘 처리할 작업은 없습니다. 다음 예정 작업과 기존 기록을 확인하세요.",
    targetId: "schedule-heading",
    title: "오늘 작업이 없습니다",
    tone: "default",
  };
}
