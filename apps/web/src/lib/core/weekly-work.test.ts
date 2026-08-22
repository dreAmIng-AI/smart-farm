import { describe, expect, it } from "vitest";

import {
  buildMonthlyWork,
  buildWeeklyWork,
  shiftSeoulMonth,
  shiftSeoulWeek,
  startOfSeoulWeek,
} from "@/lib/core/weekly-work";

describe("weekly work", () => {
  const now = new Date("2026-08-12T04:00:00.000Z");

  it("builds a Monday to Sunday Seoul week and groups scheduled tasks by day", () => {
    const days = buildWeeklyWork(
      [
        { id: "later", scheduledFor: "2026-08-13T06:00:00.000Z", status: "pending" },
        { id: "first", scheduledFor: "2026-08-13T01:00:00.000Z", status: "in_progress" },
        { id: "sunday", scheduledFor: "2026-08-16T12:00:00.000Z", status: "completed" },
        { id: "outside", scheduledFor: "2026-08-17T00:00:00.000Z", status: "pending" },
      ],
      now,
    );

    expect(days.map((day) => day.date)).toEqual([
      "2026-08-10",
      "2026-08-11",
      "2026-08-12",
      "2026-08-13",
      "2026-08-14",
      "2026-08-15",
      "2026-08-16",
    ]);
    expect(days[2].isToday).toBe(true);
    expect(days[3].tasks.map((task) => task.id)).toEqual(["first", "later"]);
    expect(days[6].tasks.map((task) => task.id)).toEqual(["sunday"]);
  });

  it("uses the Seoul weekday when a UTC date crosses into the next local day", () => {
    const sundayInSeoul = new Date("2026-08-15T15:30:00.000Z");

    expect(startOfSeoulWeek(sundayInSeoul)).toBe("2026-08-10");
    expect(shiftSeoulWeek("2026-08-10", 1)).toBe("2026-08-17");
    expect(shiftSeoulWeek("2026-08-10", -1)).toBe("2026-08-03");
  });

  it("builds a Sunday-first six-week month and keeps tasks in their Seoul dates", () => {
    const days = buildMonthlyWork(
      [
        { id: "first", scheduledFor: "2026-08-01T00:00:00.000Z", status: "pending" },
        { id: "today", scheduledFor: "2026-08-12T00:00:00.000Z", status: "in_progress" },
        { id: "outside", scheduledFor: "2026-09-06T00:00:00.000Z", status: "pending" },
      ],
      now,
    );

    expect(days).toHaveLength(42);
    expect(days[0].date).toBe("2026-07-26");
    expect(days.at(-1)?.date).toBe("2026-09-05");
    expect(days.find((day) => day.date === "2026-08-01")?.tasks.map((task) => task.id)).toEqual(["first"]);
    expect(days.find((day) => day.date === "2026-08-12")?.isToday).toBe(true);
    expect(days.find((day) => day.date === "2026-09-05")?.isCurrentMonth).toBe(false);
    expect(shiftSeoulMonth("2026-08", 1)).toBe("2026-09");
    expect(shiftSeoulMonth("2026-01", -1)).toBe("2025-12");
  });
});
