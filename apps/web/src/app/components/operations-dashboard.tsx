import {
  summarizeOperationsDashboard,
  type OperationsDashboardIssue,
  type OperationsDashboardTask,
  type OperationsDashboardTodayTask,
} from "@/lib/core/operations-dashboard";

type DashboardFarm = {
  name: string;
  regionCode: string;
};

type DashboardCropCycle = {
  cropCode: string;
  cultivar: string | null;
  growthStage: string | null;
  status: "active" | "completed" | "cancelled";
  transplantDate: string;
};

type OperationsDashboardProps = {
  cropCycle: DashboardCropCycle | null;
  farm: DashboardFarm;
  issues: OperationsDashboardIssue[];
  schedule: OperationsDashboardTask[];
  todayTasks: OperationsDashboardTodayTask[];
};

function displayDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function cropCycleStatusLabel(status: DashboardCropCycle["status"]) {
  const labels: Record<DashboardCropCycle["status"], string> = {
    active: "진행 중",
    cancelled: "취소",
    completed: "완료",
  };

  return labels[status];
}

export function OperationsDashboard({
  cropCycle,
  farm,
  issues,
  schedule,
  todayTasks,
}: OperationsDashboardProps) {
  if (!cropCycle) {
    return (
      <section className="card operations-dashboard stack" aria-labelledby="operations-dashboard-heading">
        <div className="dashboard-heading">
          <div>
            <p className="eyebrow">운영 현황</p>
            <h2 id="operations-dashboard-heading">{farm.name}</h2>
          </div>
          <span className="dashboard-context">{farm.regionCode}</span>
        </div>
        <p className="muted">현재 농장의 재배 작물을 선택하면 오늘 할 일, 지연 작업, 문제 기록, 다음 일정을 한눈에 확인할 수 있습니다.</p>
        <a className="dashboard-link" href="#saved-context-heading">재배 작물 선택으로 이동</a>
      </section>
    );
  }

  const summary = summarizeOperationsDashboard(schedule, todayTasks, issues);

  return (
    <section className="card operations-dashboard stack" aria-labelledby="operations-dashboard-heading">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">운영 현황</p>
          <h2 id="operations-dashboard-heading">{farm.name}</h2>
          <p className="muted">
            {cropCycle.cropCode}
            {cropCycle.cultivar ? ` · ${cropCycle.cultivar}` : ""} · 정식일 {cropCycle.transplantDate}
          </p>
        </div>
        <span className="dashboard-context">{cropCycleStatusLabel(cropCycle.status)}</span>
      </div>

      <p className="field-hint">
        현재 생육 단계: {cropCycle.growthStage ?? "미설정"}. 아래 값은 저장된 작업과 문제 기록을 요약한 것입니다.
      </p>

      <dl className="dashboard-metrics">
        <div>
          <dt>오늘 작업</dt>
          <dd>{summary.todayTaskCount}</dd>
        </div>
        <div className={summary.overdueTaskCount > 0 ? "metric-warning" : undefined}>
          <dt>지연 작업</dt>
          <dd>{summary.overdueTaskCount}</dd>
        </div>
        <div className={summary.openIssueCount > 0 ? "metric-warning" : undefined}>
          <dt>관리 필요 문제</dt>
          <dd>{summary.openIssueCount}</dd>
          {summary.highSeverityIssueCount > 0 ? <small>심각도 높음 {summary.highSeverityIssueCount}</small> : null}
        </div>
        <div>
          <dt>오늘 완료</dt>
          <dd>{summary.completedTodayCount}</dd>
        </div>
      </dl>

      <div className="dashboard-next-tasks stack">
        <div className="dashboard-list-heading">
          <h3>다음 예정 작업</h3>
          <a href="#plan-heading">전체 일정과 오늘 할 일 보기</a>
        </div>
        {summary.nextTasks.length > 0 ? (
          <ol className="dashboard-task-list">
            {summary.nextTasks.map((task) => (
              <li key={task.id}>
                <strong>{task.title}</strong>
                <span>{displayDate(task.scheduledFor)}</span>
                <small>우선순위 {task.priority}</small>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">현재 작기에 예정된 다음 작업이 없습니다.</p>
        )}
      </div>

      <div className="dashboard-links">
        <a className="dashboard-link" href="#plan-heading">오늘 작업 기록하기</a>
        <a className="dashboard-link dashboard-link-secondary" href="#farm-heading">농장 정보와 구성원 보기</a>
      </div>
    </section>
  );
}
