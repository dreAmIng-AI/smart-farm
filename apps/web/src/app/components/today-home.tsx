import type { ReactNode } from "react";

import {
  summarizeTodayHome,
  type TodayHomeIssue,
  type TodayHomeTask,
} from "@/lib/core/today-home";

type TodayHomeFarm = {
  name: string;
  regionCode: string;
};

type TodayHomeCropCycle = {
  cropCode: string;
  cultivar: string | null;
  growthStage: string | null;
};

type TodayHomeProps = {
  cropCycle: TodayHomeCropCycle;
  cropInformation: ReactNode;
  diseasePest: ReactNode;
  farm: TodayHomeFarm;
  isRefreshingInformation: boolean;
  issues: TodayHomeIssue[];
  loadingTaskId: string | null;
  market: ReactNode;
  onInformationRefresh: () => void;
  onTaskSelect: (taskId: string) => void;
  tasks: TodayHomeTask[];
  weather: ReactNode;
};

function taskKindLabel(task: TodayHomeTask) {
  return task.scheduleState === "overdue" ? "늦어진 작업" : "오늘 할 일";
}

export function TodayHome({
  cropCycle,
  cropInformation,
  diseasePest,
  farm,
  isRefreshingInformation,
  issues,
  loadingTaskId,
  market,
  onInformationRefresh,
  onTaskSelect,
  tasks,
  weather,
}: TodayHomeProps) {
  const summary = summarizeTodayHome(tasks, issues);
  const cropName = [cropCycle.cropCode, cropCycle.cultivar].filter(Boolean).join(" · ");
  const stageName = cropCycle.growthStage ?? "생육 단계 미입력";

  return (
    <section className="card today-home stack" aria-labelledby="today-home-heading">
      <div className="today-home-heading">
        <div>
          <p className="eyebrow">오늘의 농장</p>
          <h2 id="today-home-heading">{farm.name}</h2>
          <p className="today-home-context">
            {cropName} · 현재 {stageName}
          </p>
        </div>
        <span className="today-home-region">{farm.regionCode}</span>
      </div>

      <div className="today-home-information-refresh">
        <div>
          <h3>오늘 참고정보</h3>
          <p>날씨·병해충·재배·시장 정보의 현재 표시를 다시 확인합니다.</p>
        </div>
        <button disabled={isRefreshingInformation} onClick={onInformationRefresh} type="button">
          {isRefreshingInformation ? "확인 중..." : "참고정보 다시 확인"}
        </button>
      </div>

      <div className="today-home-counts" aria-label="오늘의 확인 항목">
        <div>
          <span>오늘 할 일</span>
          <strong>{summary.todayTaskCount}개</strong>
        </div>
        <div className={summary.overdueTaskCount > 0 ? "today-home-count-warning" : undefined}>
          <span>늦어진 일</span>
          <strong>{summary.overdueTaskCount}개</strong>
        </div>
      </div>

      <div className="today-home-work stack">
        <div className="today-home-section-heading">
          <h3>지금 확인할 일</h3>
          <a href="#today-heading">오늘 작업 전체 보기</a>
        </div>
        {summary.selectedTasks.length > 0 ? (
          <ol className="today-home-task-list">
            {summary.selectedTasks.map((task) => (
              <li key={task.id}>
                <div>
                  <strong>{task.title}</strong>
                  <span className={task.scheduleState === "overdue" ? "today-home-overdue" : undefined}>
                    {taskKindLabel(task)}
                  </span>
                </div>
                <a
                  aria-label={`${task.title} 작업 열기`}
                  href="#today-heading"
                  onClick={() => onTaskSelect(task.id)}
                >
                  {loadingTaskId === task.id ? "여는 중..." : "열기"}
                </a>
              </li>
            ))}
          </ol>
        ) : (
          <p className="today-home-empty">오늘과 늦어진 작업이 없습니다. 전체 일정을 확인해 보세요.</p>
        )}
      </div>

      {weather}

      {diseasePest}

      {cropInformation}

      {market}

      <div className="today-home-check">
        <div>
          <h3>확인해 보세요</h3>
          <p>
            {summary.activeIssueCount > 0
              ? `확인이 필요한 현장 기록 ${summary.activeIssueCount}건${summary.highSeverityIssueCount > 0 ? ` · 중요 ${summary.highSeverityIssueCount}건` : ""}`
              : "확인이 필요한 현장 기록이 없습니다."}
          </p>
        </div>
        <a href="#history-heading">기록 보기</a>
      </div>
    </section>
  );
}
