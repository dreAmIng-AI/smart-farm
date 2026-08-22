"use client";

import { useMemo, useState } from "react";

import {
  buildWeeklyWork,
  shiftSeoulWeek,
  startOfSeoulWeek,
  type WeeklyWorkTask,
} from "@/lib/core/weekly-work";

type WeeklyWorkBoardTask = WeeklyWorkTask & {
  priority: string;
  sourceType: string;
  title: string;
};

type WeeklyWorkBoardProps = {
  onTaskSelect: (taskId: string) => void;
  tasks: WeeklyWorkBoardTask[];
};

const weekdayLabels = ["월", "화", "수", "목", "금", "토", "일"];

function displayDay(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function taskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "취소",
    completed: "완료",
    in_progress: "진행 중",
    issue_reported: "문제 기록",
    pending: "예정",
  };

  return labels[status] ?? status;
}

function priorityLabel(priority: string) {
  const labels: Record<string, string> = {
    high: "높음",
    low: "낮음",
    medium: "보통",
  };

  return labels[priority] ?? priority;
}

export function WeeklyWorkBoard({ onTaskSelect, tasks }: WeeklyWorkBoardProps) {
  const now = useMemo(() => new Date(), []);
  const currentWeekStart = useMemo(() => startOfSeoulWeek(now), [now]);
  const [weekStart, setWeekStart] = useState(currentWeekStart);
  const days = useMemo(() => buildWeeklyWork(tasks, now, weekStart), [now, tasks, weekStart]);
  const taskCount = days.reduce((count, day) => count + day.tasks.length, 0);

  return (
    <section className="card weekly-work-board stack" aria-labelledby="weekly-work-heading">
      <div className="weekly-work-heading-row">
        <div>
          <p className="eyebrow">주간 작업 운영</p>
          <h2 id="weekly-work-heading">이번 주 FarmTask</h2>
          <p className="field-hint">저장된 일정만 표시합니다. 작업을 누르면 기존 상세와 결과 기록으로 이어집니다.</p>
        </div>
        <span className="weekly-work-count">{taskCount}건</span>
      </div>

      <div className="weekly-work-controls" aria-label="주간 작업 기간 이동">
        <button className="secondary compact" onClick={() => setWeekStart((value) => shiftSeoulWeek(value, -1))} type="button">
          이전 주
        </button>
        <strong>{displayDay(days[0].date)} – {displayDay(days[6].date)}</strong>
        <button className="secondary compact" disabled={weekStart === currentWeekStart} onClick={() => setWeekStart(currentWeekStart)} type="button">
          이번 주
        </button>
        <button className="secondary compact" onClick={() => setWeekStart((value) => shiftSeoulWeek(value, 1))} type="button">
          다음 주
        </button>
      </div>

      <div className="weekly-work-days">
        {days.map((day, index) => (
          <section className={day.isToday ? "weekly-work-day is-today" : "weekly-work-day"} key={day.date}>
            <header>
              <span>{weekdayLabels[index]}</span>
              <strong>{displayDay(day.date)}</strong>
              {day.isToday ? <small>오늘</small> : null}
            </header>
            {day.tasks.length > 0 ? (
              <ol>
                {day.tasks.map((task) => (
                  <li key={task.id}>
                    <button
                      aria-label={`${displayDay(day.date)} ${task.title} 작업 상세 열기`}
                      className={`weekly-work-task status-${task.status}`}
                      onClick={() => onTaskSelect(task.id)}
                      type="button"
                    >
                      <strong>{task.title}</strong>
                      <span>{taskStatusLabel(task.status)} · 우선순위 {priorityLabel(task.priority)}</span>
                      {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="field-hint">예정 작업 없음</p>
            )}
          </section>
        ))}
      </div>
    </section>
  );
}
