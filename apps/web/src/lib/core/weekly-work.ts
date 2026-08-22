import { seoulDateKey } from "@/lib/core/today";

export type WeeklyWorkTask = {
  id: string;
  scheduledFor: string;
  status: string;
};

export type WeeklyWorkDay<T extends WeeklyWorkTask> = {
  date: string;
  isToday: boolean;
  tasks: T[];
};

export type MonthlyWorkDay<T extends WeeklyWorkTask> = WeeklyWorkDay<T> & {
  isCurrentMonth: boolean;
};

const weekdayIndex: Record<string, number> = {
  Fri: 4,
  Mon: 0,
  Sat: 5,
  Sun: 6,
  Thu: 3,
  Tue: 1,
  Wed: 2,
};

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const value = new Date(Date.UTC(year, month - 1, day + days));
  return value.toISOString().slice(0, 10);
}

function monthKeyForDate(date: Date): string {
  return seoulDateKey(date).slice(0, 7);
}

function monthStartDate(month: string): string {
  return `${month}-01`;
}

export function startOfSeoulWeek(date: Date): string {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Seoul",
    weekday: "short",
  }).format(date);

  return addDays(seoulDateKey(date), -weekdayIndex[weekday]);
}

export function buildWeeklyWork<T extends WeeklyWorkTask>(
  tasks: T[],
  now = new Date(),
  weekStart = startOfSeoulWeek(now),
): WeeklyWorkDay<T>[] {
  const today = seoulDateKey(now);
  const tasksByDay = new Map<string, T[]>();

  for (const task of tasks) {
    const date = seoulDateKey(new Date(task.scheduledFor));
    const scheduled = tasksByDay.get(date) ?? [];
    scheduled.push(task);
    tasksByDay.set(date, scheduled);
  }

  return Array.from({ length: 7 }, (_, index) => {
    const date = addDays(weekStart, index);
    const dayTasks = tasksByDay.get(date) ?? [];

    return {
      date,
      isToday: date === today,
      tasks: [...dayTasks].sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor)),
    };
  });
}

export function shiftSeoulWeek(weekStart: string, weeks: number): string {
  return addDays(weekStart, weeks * 7);
}

export function shiftSeoulMonth(month: string, months: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const value = new Date(Date.UTC(year, monthNumber - 1 + months, 1));
  return value.toISOString().slice(0, 7);
}

export function buildMonthlyWork<T extends WeeklyWorkTask>(
  tasks: T[],
  now = new Date(),
  month = monthKeyForDate(now),
): MonthlyWorkDay<T>[] {
  const firstDay = monthStartDate(month);
  const firstWeekday = new Date(`${firstDay}T00:00:00.000Z`).getUTCDay();
  const calendarStart = addDays(firstDay, -firstWeekday);
  const today = seoulDateKey(now);
  const tasksByDay = new Map<string, T[]>();

  for (const task of tasks) {
    const date = seoulDateKey(new Date(task.scheduledFor));
    const scheduled = tasksByDay.get(date) ?? [];
    scheduled.push(task);
    tasksByDay.set(date, scheduled);
  }

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(calendarStart, index);
    const dayTasks = tasksByDay.get(date) ?? [];

    return {
      date,
      isCurrentMonth: date.startsWith(`${month}-`),
      isToday: date === today,
      tasks: [...dayTasks].sort((left, right) => left.scheduledFor.localeCompare(right.scheduledFor)),
    };
  });
}
