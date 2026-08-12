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
  title: string;
  reason: string;
  scheduledFor: string;
  priority: string;
  verificationStatus: string;
  status: string;
  scheduleState?: "overdue" | "today";
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
  const [farm, setFarm] = useState<Farm | null>(null);
  const [cropCycle, setCropCycle] = useState<CropCycle | null>(null);
  const [schedule, setSchedule] = useState<FarmTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<FarmTask[]>([]);
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
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id)]);
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
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id)]);
      setMessage("일정과 Today를 새로고침했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  const transplantDate = seoulDateInputValue();

  return (
    <main className="page-shell">
      <header className="hero stack">
        <p className="eyebrow">dreAmIng Smart Farm · Core v0.1</p>
        <h1>첫 Vertical Slice</h1>
        <p>
          Farm 생성 → CropCycle 생성 → Draft TaskTemplate 적용 → FarmTask 생성 → 일정과 Today 조회
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
          <h2 id="plan-heading">3. Plan · 일정 · Today</h2>
          <p className="muted">
            {cropCycle.cropCode} / {cropCycle.cultivar ?? "작물 공통"} · 정식일 {cropCycle.transplantDate}
          </p>
          <div className="button-row">
            <button disabled={isSubmitting} onClick={handlePlanGeneration} type="button">
              Draft TaskTemplate 적용
            </button>
            <button className="secondary" disabled={isSubmitting} onClick={handleRefresh} type="button">
              일정·Today 새로고침
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
                    <small>우선순위 {task.priority} · 검증 상태 {task.verificationStatus}</small>
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
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">오늘 또는 지연된 작업이 없습니다.</p>
            )}
          </div>
        </section>
      ) : null}
    </main>
  );
}
