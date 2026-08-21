import { describe, expect, it } from "vitest";

import { summarizeOperationsDashboard } from "@/lib/core/operations-dashboard";

const now = new Date("2026-08-12T04:00:00.000Z");

describe("operations dashboard summary", () => {
  it("separates today's work, overdue work, active issues, and future tasks", () => {
    const summary = summarizeOperationsDashboard(
      [
        {
          id: "done-today",
          title: "Completed today",
          priority: "medium",
          scheduledFor: "2026-08-12T00:00:00.000Z",
          status: "completed",
        },
        {
          id: "future-later",
          title: "Later task",
          priority: "low",
          scheduledFor: "2026-08-15T00:00:00.000Z",
          status: "pending",
        },
        {
          id: "future-first",
          title: "First task",
          priority: "high",
          scheduledFor: "2026-08-13T00:00:00.000Z",
          status: "in_progress",
        },
        {
          id: "cancelled",
          title: "Cancelled task",
          priority: "high",
          scheduledFor: "2026-08-13T00:00:00.000Z",
          status: "cancelled",
        },
      ],
      [
        {
          id: "overdue",
          title: "Overdue task",
          priority: "high",
          scheduledFor: "2026-08-11T00:00:00.000Z",
          status: "pending",
          scheduleState: "overdue",
        },
        {
          id: "today",
          title: "Today task",
          priority: "medium",
          scheduledFor: "2026-08-12T00:00:00.000Z",
          status: "pending",
          scheduleState: "today",
        },
      ],
      [
        { id: "high", severity: "high", status: "open" },
        { id: "review", severity: "medium", status: "needs_review" },
        { id: "resolved", severity: "high", status: "resolved" },
      ],
      now,
    );

    expect(summary).toMatchObject({
      completedTodayCount: 1,
      highSeverityIssueCount: 1,
      openIssueCount: 2,
      overdueTaskCount: 1,
      todayTaskCount: 1,
    });
    expect(summary.nextTasks.map((task) => task.id)).toEqual(["future-first", "future-later"]);
  });

  it("returns an empty future schedule when no active work is planned", () => {
    const summary = summarizeOperationsDashboard(
      [
        {
          id: "completed",
          title: "Completed task",
          priority: "medium",
          scheduledFor: "2026-08-13T00:00:00.000Z",
          status: "completed",
        },
      ],
      [],
      [],
      now,
    );

    expect(summary.nextTasks).toEqual([]);
    expect(summary.todayTaskCount).toBe(0);
    expect(summary.openIssueCount).toBe(0);
  });
});
