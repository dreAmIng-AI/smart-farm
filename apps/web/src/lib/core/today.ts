import type { TaskStatus } from "@/lib/core/types";

type TodayTask = {
  scheduledFor: string;
  status: TaskStatus;
};

const activeTaskStatuses: TaskStatus[] = ["pending", "in_progress"];

export function seoulDateKey(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function startOfSeoulDay(date: Date): string {
  return new Date(`${seoulDateKey(date)}T00:00:00.000+09:00`).toISOString();
}

export function endOfSeoulDay(date: Date): string {
  return new Date(`${seoulDateKey(date)}T23:59:59.999+09:00`).toISOString();
}

export function scheduleStateForToday(
  scheduledFor: string,
  now: Date,
): "overdue" | "today" {
  return scheduledFor < startOfSeoulDay(now) ? "overdue" : "today";
}

export function selectTodayTasks<T extends TodayTask>(
  tasks: T[],
  now: Date,
): T[] {
  const endOfDay = endOfSeoulDay(now);
  return tasks
    .filter(
      (task) =>
        activeTaskStatuses.includes(task.status) && task.scheduledFor <= endOfDay,
    )
    .sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor));
}
