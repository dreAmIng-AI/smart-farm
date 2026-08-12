import { describe, expect, it } from "vitest";

import {
  endOfSeoulDay,
  scheduleStateForToday,
  selectTodayTasks,
} from "@/lib/core/today";

const now = new Date("2026-08-12T04:00:00.000Z");

describe("Today task selection", () => {
  it("returns an empty list when there are no active tasks", () => {
    expect(selectTodayTasks([], now)).toEqual([]);
  });

  it("returns today and overdue active tasks while excluding future and completed tasks", () => {
    const tasks = [
      { id: "today", scheduledFor: "2026-08-12T00:00:00.000Z", status: "pending" as const },
      { id: "overdue", scheduledFor: "2026-08-11T00:00:00.000Z", status: "in_progress" as const },
      { id: "future", scheduledFor: "2026-08-13T00:00:00.000Z", status: "pending" as const },
      { id: "completed", scheduledFor: "2026-08-11T00:00:00.000Z", status: "completed" as const },
    ];

    expect(endOfSeoulDay(now)).toBe("2026-08-12T14:59:59.999Z");
    expect(selectTodayTasks(tasks, now).map((task) => task.id)).toEqual([
      "overdue",
      "today",
    ]);
    expect(scheduleStateForToday(tasks[0].scheduledFor, now)).toBe("today");
    expect(scheduleStateForToday(tasks[1].scheduledFor, now)).toBe("overdue");
  });
});
