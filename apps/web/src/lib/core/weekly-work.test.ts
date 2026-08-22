import { describe, expect, it } from "vitest";

import { buildWeeklyWork, shiftSeoulWeek, startOfSeoulWeek } from "@/lib/core/weekly-work";

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
});
