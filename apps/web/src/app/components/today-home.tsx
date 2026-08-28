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
  farm: TodayHomeFarm;
  hasScheduledTasks: boolean;
  issues: TodayHomeIssue[];
  loadingTaskId: string | null;
  onNavigate: (section: "record" | "information" | "farm") => void;
  onTaskSelect: (taskId: string) => void;
  tasks: TodayHomeTask[];
};

function taskKindLabel(task: TodayHomeTask) {
  return task.scheduleState === "overdue" ? "늦어진 작업" : "오늘 할 일";
}

export function TodayHome({
  cropCycle,
  farm,
  hasScheduledTasks,
  issues,
  loadingTaskId,
  onNavigate,
  onTaskSelect,
  tasks,
}: TodayHomeProps) {
  const summary = summarizeTodayHome(tasks, issues);
  const cropName = [cropCycle.cropCode, cropCycle.cultivar].filter(Boolean).join(" · ");
  const stageName = cropCycle.growthStage ?? "생육 단계 미입력";

  return (
    <section className="today-home stack" aria-labelledby="today-home-heading">
      <div className="today-home-heading">
        <div>
          <p className="eyebrow">안녕하세요</p>
          <h1 id="today-home-heading">{farm.name}</h1>
          <p className="today-home-context">
            {cropName} · 현재 {stageName}
          </p>
        </div>
        <button className="today-home-context-button" onClick={() => onNavigate("farm")} type="button">
          농장 전환
        </button>
      </div>

      <div className="today-home-primary" aria-label="오늘의 농장 요약">
        <div>
          <span>{hasScheduledTasks ? "오늘 할 일" : "작업 계획"}</span>
          <strong>{hasScheduledTasks ? `${summary.todayTaskCount}개` : "준비 필요"}</strong>
          <p>
            {!hasScheduledTasks
              ? "검증용 작업 계획을 만들면 오늘 할 일을 확인할 수 있습니다."
              : summary.overdueTaskCount > 0
              ? `늦어진 일 ${summary.overdueTaskCount}개도 함께 확인해 주세요.`
              : "필요한 작업부터 하나씩 기록해 보세요."}
          </p>
        </div>
        <button onClick={() => onNavigate("record")} type="button">
          {hasScheduledTasks ? "오늘 작업 보기" : "작업 계획 만들기"}
        </button>
      </div>

      <div className="today-home-work stack">
        <div>
          <h2>먼저 확인할 일</h2>
          <p className="field-hint">오늘과 늦어진 작업만 보여 드립니다.</p>
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
                <button
                  aria-label={`${task.title} 작업 기록`}
                  onClick={() => {
                    onTaskSelect(task.id);
                    onNavigate("record");
                  }}
                  type="button"
                >
                  {loadingTaskId === task.id ? "여는 중..." : "기록"}
                </button>
              </li>
            ))}
          </ol>
        ) : (
          <p className="today-home-empty">오늘과 늦어진 작업이 없습니다. 필요한 관찰 기록을 남길 수 있습니다.</p>
        )}
      </div>

      <div className="today-home-check" aria-label="확인이 필요한 문제">
        <div>
          <h2>확인해 보세요</h2>
          <p>
            {summary.activeIssueCount > 0
              ? `확인이 필요한 현장 기록 ${summary.activeIssueCount}건${summary.highSeverityIssueCount > 0 ? ` · 중요 ${summary.highSeverityIssueCount}건` : ""}`
              : "확인이 필요한 현장 기록이 없습니다."}
          </p>
        </div>
        <button className="secondary compact" onClick={() => onNavigate("record")} type="button">
          기록 보기
        </button>
      </div>

      <button className="today-home-information-link" onClick={() => onNavigate("information")} type="button">
        <span>농장 참고정보</span>
        <small>날씨 · 병해충 · 재배 · 시장 정보 보기</small>
      </button>
    </section>
  );
}
