"use client";

import { useMemo, useState } from "react";

import {
  buildMonthlyWork,
  shiftSeoulMonth,
  type WeeklyWorkTask,
} from "@/lib/core/weekly-work";
import { seoulDateKey } from "@/lib/core/today";

type MonthlyWorkCalendarTask = WeeklyWorkTask & {
  priority: string;
  sourceType: string;
  title: string;
};

type MonthlyWorkCalendarProps = {
  onTaskSelect: (taskId: string) => void;
  tasks: MonthlyWorkCalendarTask[];
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

function dateLabel(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { month: "long", day: "numeric" }).format(
    new Date(year, month - 1, day),
  );
}

function monthLabel(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("ko-KR", { year: "numeric", month: "long" }).format(
    new Date(year, month - 1, 1),
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

export function MonthlyWorkCalendar({ onTaskSelect, tasks }: MonthlyWorkCalendarProps) {
  const now = useMemo(() => new Date(), []);
  const currentMonth = seoulDateKey(now).slice(0, 7);
  const [month, setMonth] = useState(currentMonth);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const days = useMemo(() => buildMonthlyWork(tasks, now, month), [month, now, tasks]);
  const selectedDay = days.find((day) => day.date === selectedDate) ?? null;
  const taskCount = days.filter((day) => day.isCurrentMonth).reduce((count, day) => count + day.tasks.length, 0);

  function moveMonth(offset: number) {
    setMonth((value) => shiftSeoulMonth(value, offset));
    setSelectedDate(null);
  }

  return (
    <section className="card monthly-work-calendar stack" aria-labelledby="monthly-work-heading">
      <div className="monthly-work-heading-row">
        <div>
          <p className="eyebrow">월간 작업 달력</p>
          <h2 id="monthly-work-heading">FarmTask 일정 분포</h2>
          <p className="field-hint">날짜를 누르면 그날의 모든 작업을 확인할 수 있습니다. 저장된 FarmTask만 표시합니다.</p>
        </div>
        <span className="monthly-work-count">{taskCount}건</span>
      </div>

      <div className="monthly-work-controls" aria-label="월간 작업 기간 이동">
        <button className="secondary compact" onClick={() => moveMonth(-1)} type="button">이전 달</button>
        <strong>{monthLabel(month)}</strong>
        <button className="secondary compact" disabled={month === currentMonth} onClick={() => { setMonth(currentMonth); setSelectedDate(null); }} type="button">이번 달</button>
        <button className="secondary compact" onClick={() => moveMonth(1)} type="button">다음 달</button>
      </div>

      <div className="monthly-work-grid-scroll">
        <div className="monthly-work-grid" role="grid" aria-label={`${monthLabel(month)} FarmTask 달력`}>
          {weekdayLabels.map((label, index) => (
            <span className={`monthly-work-weekday weekday-${index}`} key={label} role="columnheader">{label}</span>
          ))}
          {days.map((day) => {
            const visibleTasks = day.tasks.slice(0, 2);
            const extraTaskCount = day.tasks.length - visibleTasks.length;

            return (
              <section
                className={[
                  "monthly-work-day",
                  day.isCurrentMonth ? "" : "is-outside-month",
                  day.isToday ? "is-today" : "",
                  selectedDate === day.date ? "is-selected" : "",
                ].filter(Boolean).join(" ")}
                key={day.date}
                role="gridcell"
              >
                <button
                  aria-label={`${dateLabel(day.date)} ${day.tasks.length}개 작업 보기`}
                  className="monthly-work-date"
                  onClick={() => setSelectedDate(day.date)}
                  type="button"
                >
                  <span>{day.date.slice(-2).replace(/^0/, "")}</span>
                  {day.isToday ? <small>오늘</small> : null}
                </button>
                {visibleTasks.length > 0 ? (
                  <ol>
                    {visibleTasks.map((task) => (
                      <li key={task.id}>
                        <button
                          aria-label={`${dateLabel(day.date)} ${task.title} 작업 상세 열기`}
                          className={`monthly-work-task status-${task.status}`}
                          onClick={() => onTaskSelect(task.id)}
                          type="button"
                        >
                          {task.title}
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}
                {extraTaskCount > 0 ? (
                  <button className="monthly-work-more" onClick={() => setSelectedDate(day.date)} type="button">
                    +{extraTaskCount}개 더 보기
                  </button>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      {selectedDay ? (
        <section className="monthly-selected-day stack" aria-live="polite" aria-labelledby="monthly-selected-day-heading">
          <div className="monthly-selected-day-heading">
            <h3 id="monthly-selected-day-heading">{dateLabel(selectedDay.date)} 작업</h3>
            <button className="secondary compact" onClick={() => setSelectedDate(null)} type="button">닫기</button>
          </div>
          {selectedDay.tasks.length > 0 ? (
            <ol>
              {selectedDay.tasks.map((task) => (
                <li key={task.id}>
                  <button className={`monthly-selected-task status-${task.status}`} onClick={() => onTaskSelect(task.id)} type="button">
                    <strong>{task.title}</strong>
                    <span>{taskStatusLabel(task.status)} · 우선순위 {priorityLabel(task.priority)}</span>
                    {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="field-hint">이 날짜에는 저장된 작업이 없습니다.</p>
          )}
        </section>
      ) : null}
    </section>
  );
}
