export type TodayHomeTask = {
  id: string;
  priority: string;
  scheduleState?: "overdue" | "today";
  scheduledFor: string;
  status: string;
  title: string;
};

export type TodayHomeIssue = {
  id: string;
  severity: string;
  status: "open" | "needs_review" | "resolved" | "closed_without_action";
};

const activeIssueStatuses = new Set<TodayHomeIssue["status"]>(["open", "needs_review"]);
const priorityOrder: Record<string, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function taskOrder(left: TodayHomeTask, right: TodayHomeTask) {
  const leftScheduleOrder = left.scheduleState === "overdue" ? 0 : 1;
  const rightScheduleOrder = right.scheduleState === "overdue" ? 0 : 1;

  return (
    leftScheduleOrder - rightScheduleOrder ||
    (priorityOrder[left.priority] ?? 3) - (priorityOrder[right.priority] ?? 3) ||
    left.scheduledFor.localeCompare(right.scheduledFor)
  );
}

export function summarizeTodayHome(tasks: TodayHomeTask[], issues: TodayHomeIssue[]) {
  const activeIssues = issues.filter((issue) => activeIssueStatuses.has(issue.status));
  const overdueTaskCount = tasks.filter((task) => task.scheduleState === "overdue").length;

  return {
    activeIssueCount: activeIssues.length,
    highSeverityIssueCount: activeIssues.filter((issue) => issue.severity === "high").length,
    overdueTaskCount,
    selectedTasks: [...tasks].sort(taskOrder).slice(0, 3),
    todayTaskCount: tasks.length - overdueTaskCount,
  };
}
