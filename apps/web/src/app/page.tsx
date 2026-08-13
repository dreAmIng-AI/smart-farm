"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Farm = {
  id: string;
  name: string;
  regionCode: string;
};

type CropCycle = {
  id: string;
  cropCode: string;
  cultivar: string | null;
  transplantDate: string;
};

type FarmTask = {
  id: string;
  parentIssueId?: string | null;
  title: string;
  reason: string;
  scheduledFor: string;
  priority: string;
  verificationStatus: string;
  sourceType: string;
  status: string;
  scheduleState?: "overdue" | "today";
};

type TaskResultAction = "completed" | "not_checked" | "issue_reported";

type IssueDraft = {
  observedSymptom: string;
  severity: "low" | "medium" | "high" | "unknown";
  expertReviewRequired: boolean;
};

type Issue = IssueDraft & {
  id: string;
  status: "open" | "needs_review" | "resolved" | "closed_without_action";
  taskTitle: string;
};

type TaskResultResponse = {
  issue?: Omit<Issue, "taskTitle">;
};

type HistoryItem =
  | {
      id: string;
      kind: "action_log";
      occurredAt: string;
      taskTitle: string;
      actionType: string;
      resultCode: string | null;
      note: string | null;
    }
  | {
      id: string;
      kind: "issue";
      occurredAt: string;
      issueId: string;
      taskTitle: string;
      observedSymptom: string;
      severity: string;
      status: "open" | "needs_review" | "resolved" | "closed_without_action";
      expertReviewRequired: boolean;
    }
  | {
      id: string;
      kind: "follow_up_task";
      occurredAt: string;
      taskTitle: string;
      parentIssueId: string;
      status: string;
      scheduledFor: string;
    };

function errorMessage(value: unknown): string {
  if (typeof value === "object" && value !== null && "error" in value) {
    const error = value.error;
    if (typeof error === "object" && error !== null && "message" in error) {
      const message = error.message;
      if (typeof message === "string") {
        return message;
      }
    }
  }
  return "요청을 처리하지 못했습니다.";
}

function seoulDateInputValue() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

function displayDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeZone: "Asia/Seoul",
  }).format(new Date(value));
}

function taskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    cancelled: "취소됨",
    completed: "완료",
    in_progress: "진행 중",
    issue_reported: "문제 기록됨",
    pending: "예정",
  };

  return labels[status] ?? status;
}

function issueSeverityLabel(severity: string) {
  const labels: Record<string, string> = {
    high: "높음",
    low: "낮음",
    medium: "보통",
    unknown: "알 수 없음",
  };

  return labels[severity] ?? severity;
}

async function apiRequest<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  const data: unknown = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(errorMessage(data));
  }

  return data as T;
}

export default function HomePage() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [farmFeedback, setFarmFeedback] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [issueDrafts, setIssueDrafts] = useState<Record<string, IssueDraft>>({});
  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [cropCycle, setCropCycle] = useState<CropCycle | null>(null);
  const [schedule, setSchedule] = useState<FarmTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<FarmTask[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [message, setMessage] = useState(
    "Supabase 인증 세션과 .env.local 설정 후 첫 Slice를 실행할 수 있습니다.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) {
        setUserEmail(user?.email ?? null);
        setIsAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail(session?.user.email ?? null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = form.get("password");

    if (typeof password !== "string") {
      return;
    }

    setIsAuthenticating(true);
    setMessage("");
    try {
      const { error } = await createBrowserSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) {
        throw error;
      }
      setMessage("로그인되었습니다. Farm 생성부터 시작하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleSignOut() {
    setIsAuthenticating(true);
    try {
      const { error } = await createBrowserSupabaseClient().auth.signOut();
      if (error) {
        throw error;
      }
      setFarm(null);
      setCropCycle(null);
      setSchedule([]);
      setTodayTasks([]);
      setFarmFeedback(null);
      setActionNotes({});
      setIssueDrafts({});
      setHistory([]);
      setSelectedIssue(null);
      setMessage("로그아웃되었습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그아웃에 실패했습니다.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleFarmCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    setFarmFeedback("Farm을 생성하고 있습니다.");

    try {
      const created = await apiRequest<Farm>("/api/farms", {
        method: "POST",
        body: JSON.stringify({
          name: form.get("name"),
          regionCode: form.get("regionCode"),
          cultivationEnvironment: form.get("cultivationEnvironment"),
          cultivationMethod: form.get("cultivationMethod"),
        }),
      });
      setFarm(created);
      setCropCycle(null);
      setSchedule([]);
      setTodayTasks([]);
      setHistory([]);
      setSelectedIssue(null);
      setMessage(`Farm “${created.name}”을 만들었습니다.`);
      setFarmFeedback(`Farm “${created.name}”이 생성되었습니다.`);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "Farm 생성에 실패했습니다.";
      setMessage(errorText);
      setFarmFeedback(errorText);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleCropCycleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsSubmitting(true);
    try {
      const created = await apiRequest<CropCycle>(`/api/farms/${farm.id}/crop-cycles`, {
        method: "POST",
        body: JSON.stringify({
          cropCode: form.get("cropCode"),
          cultivar: form.get("cultivar"),
          transplantDate: form.get("transplantDate"),
          growthStage: form.get("growthStage"),
        }),
      });
      setCropCycle(created);
      setSchedule([]);
      setTodayTasks([]);
      setHistory([]);
      setSelectedIssue(null);
      setMessage("CropCycle을 만들었습니다. Draft Template을 적용해 계획을 생성하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CropCycle 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function loadSchedule(cropCycleId: string) {
    const result = await apiRequest<{ items: FarmTask[] }>(
      `/api/crop-cycles/${cropCycleId}/schedule`,
      { method: "GET" },
    );
    setSchedule(result.items);
  }

  async function loadTodayTasks(farmId: string) {
    const result = await apiRequest<{ items: FarmTask[] }>(
      `/api/farms/${farmId}/tasks/today`,
      { method: "GET" },
    );
    setTodayTasks(result.items);
  }

  async function loadHistory(farmId: string) {
    const result = await apiRequest<{ items: HistoryItem[] }>(`/api/farms/${farmId}/history`, {
      method: "GET",
    });
    setHistory(result.items);
  }

  async function handlePlanGeneration() {
    if (!cropCycle || !farm) {
      return;
    }

    setIsSubmitting(true);
    try {
      const generated = await apiRequest<{ generatedCount: number }>(
        `/api/crop-cycles/${cropCycle.id}/tasks/generate`,
        { method: "POST" },
      );
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      setMessage(
        generated.generatedCount > 0
          ? `${generated.generatedCount}개의 Draft FarmTask를 생성했습니다.`
          : "생성할 새 Task가 없습니다. 기존 계획은 그대로 유지됩니다.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업계획 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRefresh() {
    if (!cropCycle || !farm) {
      return;
    }

    setIsSubmitting(true);
    try {
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      setMessage("일정, Today, 이력을 새로고침했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function issueDraftFor(taskId: string): IssueDraft {
    return issueDrafts[taskId] ?? {
      observedSymptom: "",
      severity: "unknown",
      expertReviewRequired: false,
    };
  }

  function updateIssueDraft(taskId: string, updates: Partial<IssueDraft>) {
    setIssueDrafts((drafts) => ({ ...drafts, [taskId]: { ...issueDraftFor(taskId), ...updates } }));
  }

  function selectIssueForFollowUp(issue: Issue) {
    setSelectedIssue(issue);
  }

  async function handleTaskResult(task: FarmTask, actionType: TaskResultAction) {
    if (!farm || !cropCycle) {
      return;
    }

    const taskId = task.id;
    setIsSubmitting(true);
    setRecordingTaskId(taskId);
    try {
      const recorded = await apiRequest<TaskResultResponse>(`/api/tasks/${taskId}/action-logs`, {
        method: "POST",
        body: JSON.stringify({
          actionType,
          note: actionNotes[taskId] ?? "",
          ...(actionType === "issue_reported" ? { issue: issueDraftFor(taskId) } : {}),
        }),
      });
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      setActionNotes((notes) => {
        const nextNotes = { ...notes };
        delete nextNotes[taskId];
        return nextNotes;
      });
      if (recorded.issue) {
        setIssueDrafts((drafts) => {
          const nextDrafts = { ...drafts };
          delete nextDrafts[taskId];
          return nextDrafts;
        });
        setSelectedIssue({ ...recorded.issue, taskTitle: task.title });
      }
      setMessage(
        actionType === "completed"
          ? "완료 결과를 기록했습니다. 작업이 Today에서 제외되었습니다."
          : actionType === "not_checked"
            ? "확인하지 못함 결과를 기록했습니다. 작업은 재확인을 위해 Today에 남아 있습니다."
            : "관찰한 문제를 기록했습니다. 원본 작업은 문제 기록 상태가 되었고, 필요하면 재확인 작업을 만드세요.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 결과 기록에 실패했습니다.");
    } finally {
      setRecordingTaskId(null);
      setIsSubmitting(false);
    }
  }

  async function handleFollowUpCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm || !cropCycle || !selectedIssue) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsCreatingFollowUp(true);
    try {
      const created = await apiRequest<{ farmTask: { title: string; scheduledFor: string } }>(
        `/api/issues/${selectedIssue.id}/follow-up-tasks`,
        {
          method: "POST",
          body: JSON.stringify({
            title: form.get("title"),
            scheduledFor: form.get("scheduledFor"),
            priority: form.get("priority"),
          }),
        },
      );
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      setSelectedIssue(null);
      setMessage(`${created.farmTask.title} 재확인 작업을 만들었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "재확인 작업 생성에 실패했습니다.");
    } finally {
      setIsCreatingFollowUp(false);
    }
  }

  const transplantDate = seoulDateInputValue();

  return (
    <main className="page-shell">
      <header className="hero stack">
        <p className="eyebrow">dreAmIng Smart Farm · Core v0.1</p>
        <h1>Core v0.1 Work Cycle</h1>
        <p>
          Farm 생성 → CropCycle 생성 → Draft TaskTemplate 적용 → FarmTask 생성 → 일정과 Today → 결과 기록
        </p>
        <p className="draft-notice">
          현재 Template은 개발 Fixture이며 검증 상태가 <strong>draft</strong>입니다. 실제 농업 처방이 아닙니다.
        </p>
      </header>

      {isAuthLoading ? <p className="status">인증 상태를 확인하고 있습니다.</p> : null}

      {!isAuthLoading && !userEmail ? (
        <section className="card stack" aria-labelledby="sign-in-heading">
          <h2 id="sign-in-heading">로그인</h2>
          <p className="muted">Supabase에서 생성한 테스트 계정으로 로그인하세요.</p>
          <form className="stack" onSubmit={handleSignIn}>
            <label>
              이메일
              <input
                autoComplete="email"
                name="email"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              비밀번호
              <input autoComplete="current-password" name="password" required type="password" />
            </label>
            <button disabled={isAuthenticating} type="submit">
              이메일로 로그인
            </button>
          </form>
        </section>
      ) : null}

      {!isAuthLoading && userEmail ? (
        <div className="session-row">
          <span>{userEmail}로 로그인됨</span>
          <button className="secondary compact" disabled={isAuthenticating} onClick={handleSignOut} type="button">
            로그아웃
          </button>
        </div>
      ) : null}

      <p className="status" role="status">
        {message}
      </p>

      {userEmail ? <section className="card stack" aria-labelledby="farm-heading">
        <h2 id="farm-heading">1. Farm 생성</h2>
        <form className="stack" onSubmit={handleFarmCreate}>
          <label>
            농장명
            <input name="name" required defaultValue="개발용 농장" />
          </label>
          <label>
            지역 코드
            <input name="regionCode" required defaultValue="KR-DEMO" />
          </label>
          <label>
            재배 환경
            <select name="cultivationEnvironment" defaultValue="facility">
              <option value="facility">시설 재배</option>
              <option value="open_field">노지 재배</option>
            </select>
          </label>
          <label>
            재배 방식 (선택)
            <input name="cultivationMethod" defaultValue="protected_cultivation" />
          </label>
          <button disabled={isSubmitting} type="submit">
            {isSubmitting ? "Farm 생성 중..." : "Farm 만들기"}
          </button>
        </form>
        {farmFeedback ? (
          <p className="inline-status" role="status">
            {farmFeedback}
          </p>
        ) : null}
      </section> : null}

      {userEmail && farm ? (
        <section className="card stack" aria-labelledby="cycle-heading">
          <h2 id="cycle-heading">2. CropCycle 생성</h2>
          <p className="muted">현재 Farm: {farm.name}</p>
          <form className="stack" onSubmit={handleCropCycleCreate}>
            <label>
              작물 코드
              <input name="cropCode" required defaultValue="strawberry" />
            </label>
            <label>
              품종 (선택)
              <input name="cultivar" defaultValue="seolhyang" />
            </label>
            <label>
              정식일
              <input name="transplantDate" required type="date" defaultValue={transplantDate} />
            </label>
          <label>
            생육 단계 (선택 사항)
            <input name="growthStage" defaultValue="establishment" placeholder="예: establishment" />
          </label>
          <p className="field-hint">
            현재는 직접 입력하거나 비워 둘 수 있습니다. 생육 단계별 선택 목록은 Crop Pack 데이터가 준비된 뒤 제공합니다.
          </p>
            <button disabled={isSubmitting} type="submit">
              CropCycle 만들기
            </button>
          </form>
        </section>
      ) : null}

      {userEmail && cropCycle && farm ? (
        <section className="card stack" aria-labelledby="plan-heading">
          <h2 id="plan-heading">3. Plan · 일정 · Today · 이력</h2>
          <p className="muted">
            {cropCycle.cropCode} / {cropCycle.cultivar ?? "작물 공통"} · 정식일 {cropCycle.transplantDate}
          </p>
          <div className="button-row">
            <button disabled={isSubmitting} onClick={handlePlanGeneration} type="button">
              Draft TaskTemplate 적용
            </button>
            <button className="secondary" disabled={isSubmitting} onClick={handleRefresh} type="button">
              일정·Today·이력 새로고침
            </button>
          </div>

          <div className="stack" aria-live="polite">
            <h3>작기 전체 일정</h3>
            {schedule.length > 0 ? (
              <ol className="task-list">
                {schedule.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <span>{displayDate(task.scheduledFor)}</span>
                    <small>{task.reason}</small>
                    <small>
                      상태 {taskStatusLabel(task.status)} · 우선순위 {task.priority} · 검증 상태 {task.verificationStatus}
                    </small>
                    {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">아직 생성된 FarmTask가 없습니다.</p>
            )}
          </div>

          <div className="stack" aria-live="polite">
            <h3>Today</h3>
            {todayTasks.length > 0 ? (
              <ol className="task-list">
                {todayTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <span className={task.scheduleState === "overdue" ? "overdue" : "today"}>
                      {task.scheduleState === "overdue" ? "지연 작업" : "오늘 작업"}
                    </span>
                    <small>{task.reason}</small>
                    <small>검증 상태 {task.verificationStatus}</small>
                    {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                    <div className="result-entry">
                      <label>
                        기록 메모 (선택 사항)
                        <input
                          disabled={isSubmitting}
                          maxLength={1000}
                          onChange={(event) =>
                            setActionNotes((notes) => ({ ...notes, [task.id]: event.target.value }))
                          }
                          placeholder="관찰한 사실이나 작업 결과를 짧게 남기세요"
                          value={actionNotes[task.id] ?? ""}
                        />
                      </label>
                      <div className="action-buttons">
                        <button
                          disabled={isSubmitting}
                          onClick={() => handleTaskResult(task, "completed")}
                          type="button"
                        >
                          {recordingTaskId === task.id ? "기록 중..." : "완료 기록"}
                        </button>
                        <button
                          className="secondary"
                          disabled={isSubmitting}
                          onClick={() => handleTaskResult(task, "not_checked")}
                          type="button"
                        >
                          확인하지 못함
                        </button>
                      </div>
                      <details className="issue-entry">
                        <summary>문제 있음 기록</summary>
                        <p className="field-hint">
                          관찰한 사실만 기록합니다. 이 기록은 농업적 확정 진단이나 처방이 아닙니다.
                        </p>
                        <label>
                          관찰 내용
                          <textarea
                            disabled={isSubmitting}
                            maxLength={1000}
                            onChange={(event) => updateIssueDraft(task.id, { observedSymptom: event.target.value })}
                            placeholder="예: 작업 중 관찰한 상태를 사실대로 적어주세요"
                            required
                            value={issueDraftFor(task.id).observedSymptom}
                          />
                        </label>
                        <label>
                          심각도
                          <select
                            disabled={isSubmitting}
                            onChange={(event) =>
                              updateIssueDraft(task.id, {
                                severity: event.target.value as IssueDraft["severity"],
                              })
                            }
                            value={issueDraftFor(task.id).severity}
                          >
                            <option value="unknown">알 수 없음</option>
                            <option value="low">낮음</option>
                            <option value="medium">보통</option>
                            <option value="high">높음</option>
                          </select>
                        </label>
                        <label className="checkbox-label">
                          <input
                            checked={issueDraftFor(task.id).expertReviewRequired}
                            disabled={isSubmitting}
                            onChange={(event) =>
                              updateIssueDraft(task.id, { expertReviewRequired: event.target.checked })
                            }
                            type="checkbox"
                          />
                          전문가 확인이 필요함
                        </label>
                        <button
                          className="issue-button"
                          disabled={isSubmitting || issueDraftFor(task.id).observedSymptom.trim().length === 0}
                          onClick={() => handleTaskResult(task, "issue_reported")}
                          type="button"
                        >
                          {recordingTaskId === task.id ? "문제 기록 중..." : "문제 기록"}
                        </button>
                      </details>
                    </div>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">오늘 또는 지연된 작업이 없습니다.</p>
            )}
          </div>

          {selectedIssue ? (
            <section className="issue-follow-up stack" aria-labelledby="follow-up-heading">
              <h3 id="follow-up-heading">문제 재확인 작업</h3>
              <p className="muted">
                {selectedIssue.taskTitle} · 관찰: {selectedIssue.observedSymptom} · 심각도 {issueSeverityLabel(selectedIssue.severity)}
              </p>
              <form className="stack" onSubmit={handleFollowUpCreate}>
                <label>
                  재확인 작업 제목
                  <input defaultValue={`${selectedIssue.taskTitle} 재확인`} maxLength={200} name="title" required />
                </label>
                <label>
                  재확인 예정일
                  <input defaultValue={seoulDateInputValue()} name="scheduledFor" required type="date" />
                </label>
                <label>
                  우선순위
                  <select defaultValue="medium" name="priority">
                    <option value="low">낮음</option>
                    <option value="medium">보통</option>
                    <option value="high">높음</option>
                  </select>
                </label>
                <div className="action-buttons">
                  <button disabled={isCreatingFollowUp} type="submit">
                    {isCreatingFollowUp ? "생성 중..." : "재확인 작업 만들기"}
                  </button>
                  <button
                    className="secondary"
                    disabled={isCreatingFollowUp}
                    onClick={() => setSelectedIssue(null)}
                    type="button"
                  >
                    취소
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <div className="stack" aria-live="polite">
            <h3>이력</h3>
            {history.length > 0 ? (
              <ol className="history-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <span>{displayDate(item.occurredAt)}</span>
                    {item.kind === "action_log" ? (
                      <>
                        <strong>{item.taskTitle}</strong>
                        <small>
                          결과 기록: {item.actionType}
                          {item.note ? ` · ${item.note}` : ""}
                        </small>
                      </>
                    ) : null}
                    {item.kind === "issue" ? (
                      <>
                        <strong>{item.taskTitle} · 문제 기록</strong>
                        <small>
                          관찰: {item.observedSymptom} · 심각도 {issueSeverityLabel(item.severity)} · 상태 {item.status}
                        </small>
                        {item.expertReviewRequired ? <small>전문가 확인 필요</small> : null}
                        {item.status === "open" || item.status === "needs_review" ? (
                          <button
                            className="secondary compact"
                            onClick={() =>
                              selectIssueForFollowUp({
                                id: item.issueId,
                                observedSymptom: item.observedSymptom,
                                severity: item.severity as Issue["severity"],
                                expertReviewRequired: item.expertReviewRequired,
                                status: item.status,
                                taskTitle: item.taskTitle,
                              })
                            }
                            type="button"
                          >
                            재확인 작업 만들기
                          </button>
                        ) : null}
                      </>
                    ) : null}
                    {item.kind === "follow_up_task" ? (
                      <>
                        <strong>{item.taskTitle} · 재확인 작업</strong>
                        <small>예정일 {displayDate(item.scheduledFor)} · 상태 {taskStatusLabel(item.status)}</small>
                      </>
                    ) : null}
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">아직 결과·문제·재확인 작업 이력이 없습니다.</p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
