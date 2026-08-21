import { endOfSeoulDay, startOfSeoulDay } from "@/lib/core/today";

export type OperationsDashboardTask = {
  id: string;
  title: string;
  priority: string;
  scheduledFor: string;
  status: string;
};

export type OperationsDashboardTodayTask = OperationsDashboardTask & {
  scheduleState?: "overdue" | "today";
};

export type OperationsDashboardIssue = {
  id: string;
  severity: string;
  status: "open" | "needs_review" | "resolved" | "closed_without_action";
};

const activeTaskStatuses = new Set(["pending", "in_progress"]);
const activeIssueStatuses = new Set<OperationsDashboardIssue["status"]>(["open", "needs_review"]);

export function summarizeOperationsDashboard(
  schedule: OperationsDashboardTask[],
  todayTasks: OperationsDashboardTodayTask[],
  issues: OperationsDashboardIssue[],
  now = new Date(),
) {
  const startOfToday = startOfSeoulDay(now);
  const endOfToday = endOfSeoulDay(now);
  const activeIssues = issues.filter((issue) => activeIssueStatuses.has(issue.status));

  return {
    completedTodayCount: schedule.filter(
      (task) =>
        task.status === "completed" &&
        task.scheduledFor >= startOfToday &&
        task.scheduledFor <= endOfToday,
    ).length,
    highSeverityIssueCount: activeIssues.filter((issue) => issue.severity === "high").length,
    nextTasks: schedule
      .filter(
        (task) => activeTaskStatuses.has(task.status) && task.scheduledFor > endOfToday,
      )
      .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor))
      .slice(0, 3),
    openIssueCount: activeIssues.length,
    overdueTaskCount: todayTasks.filter((task) => task.scheduleState === "overdue").length,
    todayTaskCount: todayTasks.filter((task) => task.scheduleState !== "overdue").length,
  };
}
