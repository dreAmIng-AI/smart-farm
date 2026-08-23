import { describe, expect, it } from "vitest";

import { summarizeTodayHome } from "@/lib/core/today-home";

describe("Today home summary", () => {
  it("shows overdue work before today work and limits the first view to three tasks", () => {
    const summary = summarizeTodayHome(
      [
        { id: "today-low", priority: "low", scheduleState: "today", scheduledFor: "2026-08-24T00:00:00.000Z", status: "pending", title: "Today low" },
        { id: "overdue-medium", priority: "medium", scheduleState: "overdue", scheduledFor: "2026-08-22T00:00:00.000Z", status: "pending", title: "Overdue medium" },
        { id: "today-high", priority: "high", scheduleState: "today", scheduledFor: "2026-08-24T00:00:00.000Z", status: "pending", title: "Today high" },
        { id: "overdue-high", priority: "high", scheduleState: "overdue", scheduledFor: "2026-08-23T00:00:00.000Z", status: "pending", title: "Overdue high" },
      ],
      [],
    );

    expect(summary).toMatchObject({ overdueTaskCount: 2, todayTaskCount: 2 });
    expect(summary.selectedTasks.map((task) => task.id)).toEqual(["overdue-high", "overdue-medium", "today-high"]);
  });

  it("counts only unresolved observation records", () => {
    const summary = summarizeTodayHome([], [
      { id: "open", severity: "high", status: "open" },
      { id: "review", severity: "medium", status: "needs_review" },
      { id: "resolved", severity: "high", status: "resolved" },
    ]);

    expect(summary).toMatchObject({ activeIssueCount: 2, highSeverityIssueCount: 1 });
  });
});
