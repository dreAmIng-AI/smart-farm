"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useEffect, useEffectEvent, useRef, useState } from "react";

import { OperationsDashboard } from "@/app/components/operations-dashboard";
import { FarmAreaPanel } from "@/app/components/farm-area-panel";
import { FarmSetupProgress } from "@/app/components/farm-setup-progress";
import { MonthlyWorkCalendar } from "@/app/components/monthly-work-calendar";
import { MobileNavigation, type AppSection } from "@/app/components/mobile-navigation";
import { MeasurementPanel } from "@/app/components/measurement-panel";
import { ObservationPanel } from "@/app/components/observation-panel";
import { WeeklyWorkBoard } from "@/app/components/weekly-work-board";
import { WorkCycleGuidance } from "@/app/components/work-cycle-guidance";
import { TodayHome } from "@/app/components/today-home";
import { CropReferenceCard } from "@/app/components/crop-reference-card";
import { DiseasePestCard } from "@/app/components/disease-pest-card";
import { MarketReferenceCard } from "@/app/components/market-reference-card";
import { WeatherCard } from "@/app/components/weather-card";
import { WeatherLocationPanel } from "@/app/components/weather-location-panel";
import {
  canRegenerateFarmInvitation,
  copyFarmInvitationLink,
  createFarmInvitationEmailComposeUrl,
  shareFarmInvitationLink,
} from "@/lib/invitation-sharing";
import { parseInvitationAccountSetupInput, removeFarmInvitationToken } from "@/lib/invitation-acceptance";
import {
  parseSelectedContext,
  selectedContextStorageKey,
  type SelectedContext,
} from "@/lib/core/selected-context";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Farm = {
  id: string;
  name: string;
  regionCode: string;
  cultivationEnvironment: "facility" | "open_field";
  cultivationMethod: string | null;
};

function readSelectedContext(userId: string) {
  if (typeof window === "undefined") return null;
  return parseSelectedContext(window.sessionStorage.getItem(selectedContextStorageKey(userId)));
}

function saveSelectedContext(userId: string | null, farmId: string, cropCycleId: string | null) {
  if (typeof window === "undefined" || !userId) return;
  window.sessionStorage.setItem(selectedContextStorageKey(userId), JSON.stringify({ farmId, cropCycleId }));
}

function clearSelectedContext(userId: string | null) {
  if (typeof window === "undefined" || !userId) return;
  window.sessionStorage.removeItem(selectedContextStorageKey(userId));
}

type FarmListResponse = {
  items: Farm[];
  permissions: {
    canCreateFarm: boolean;
  };
};

type FarmRole = "owner" | "admin" | "farmer";

type FarmMember = {
  userId: string;
  email: string;
  role: FarmRole;
  createdAt: string;
};

type FarmInvitation = {
  id: string;
  email: string;
  role: Exclude<FarmRole, "owner">;
  status: "pending";
  expiresAt: string;
  createdAt: string;
};

type FarmCollaboration = {
  actorRole: FarmRole;
  members: FarmMember[];
  invitations: FarmInvitation[];
};

type FarmInvitationResponse = {
  id: string;
  email: string;
  role: Exclude<FarmRole, "owner">;
  expiresAt: string;
  inviteUrl: string;
};

type CropCycle = {
  id: string;
  farmId: string;
  cropCode: string;
  cultivar: string | null;
  farmAreaId: string | null;
  transplantDate: string;
  growthStage: string | null;
  status: "active" | "completed" | "cancelled";
  endedAt: string | null;
};

type FarmTask = {
  assignedUserId: string | null;
  farmAreaId: string | null;
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

type FarmArea = {
  id: string;
  name: string;
};

type TaskDetail = FarmTask & {
  farmId: string;
  cropCycleId: string;
  taskTemplateId: string | null;
  taskType: string;
  dueAt: string | null;
  evidence: unknown[];
  resultRequired: boolean;
  completedAt: string | null;
  createdAt: string;
};

type TaskResultAction = "started" | "completed" | "not_checked" | "issue_reported";
type IssueStatus = "open" | "needs_review" | "resolved" | "closed_without_action";
type CropCycleTerminalStatus = Exclude<CropCycle["status"], "active">;

type IssueDraft = {
  observedSymptom: string;
  severity: "low" | "medium" | "high" | "unknown";
  expertReviewRequired: boolean;
};

type Issue = IssueDraft & {
  id: string;
  status: IssueStatus;
  taskTitle: string;
};

type TaskResultResponse = {
  actionLog: {
    id: string;
  };
  issue?: Omit<Issue, "taskTitle">;
};

type TaskAssignmentResponse = {
  task: {
    id: string;
    assignedUserId: string | null;
  };
};

type AttachmentTarget = {
  id: string;
  kind: "action_log" | "issue";
  taskTitle: string;
};

type HistoryAttachment = {
  id: string;
  mimeType: string;
  signedUrl: string | null;
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
      attachments: HistoryAttachment[];
    }
  | {
      id: string;
      kind: "issue";
      occurredAt: string;
      issueId: string;
      actionLogId: string | null;
      cropCycleId: string | null;
      farmTaskId: string | null;
      observationId: string | null;
      origin: "task" | "observation";
      taskTitle: string;
      observedSymptom: string;
      severity: string;
      status: IssueStatus;
      expertReviewRequired: boolean;
      attachments: HistoryAttachment[];
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

function taskSourceLabel(sourceType: string) {
  const labels: Record<string, string> = {
    issue_followup: "문제 재확인",
    manual: "직접 등록",
    template: "Crop Pack 템플릿",
  };

  return labels[sourceType] ?? sourceType;
}

function actionTypeLabel(actionType: string) {
  const labels: Record<string, string> = {
    completed: "완료",
    issue_reported: "문제 기록",
    not_checked: "확인하지 못함",
    started: "작업 시작",
    viewed: "확인",
  };

  return labels[actionType] ?? actionType;
}

function evidenceLabel(evidence: unknown) {
  if (typeof evidence === "string") {
    return evidence;
  }

  if (evidence === null) {
    return "근거 정보";
  }

  try {
    return JSON.stringify(evidence) ?? "근거 정보";
  } catch {
    return "근거 정보";
  }
}

function cropCycleStatusLabel(status: CropCycle["status"]) {
  const labels: Record<CropCycle["status"], string> = {
    active: "진행 중",
    completed: "완료",
    cancelled: "취소",
  };

  return labels[status];
}

function farmRoleLabel(role: FarmRole) {
  const labels: Record<FarmRole, string> = {
    admin: "관리자",
    farmer: "작업자",
    owner: "소유자",
  };

  return labels[role];
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

function issueStatusLabel(status: IssueStatus) {
  const labels: Record<IssueStatus, string> = {
    open: "열림",
    needs_review: "검토 필요",
    resolved: "해결됨",
    closed_without_action: "조치 없이 종료",
  };

  return labels[status];
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

function AttachmentList({ attachments }: { attachments: HistoryAttachment[] }) {
  return (
    <div className="attachment-list" aria-label="첨부 사진">
      {attachments.map((attachment) =>
        attachment.signedUrl ? (
          <a href={attachment.signedUrl} key={attachment.id} rel="noreferrer" target="_blank">
            <Image
              alt="기록 첨부 사진"
              height={72}
              src={attachment.signedUrl}
              unoptimized
              width={72}
            />
          </a>
        ) : (
          <small key={attachment.id}>첨부 사진을 현재 열 수 없습니다.</small>
        ),
      )}
    </div>
  );
}

export default function HomePage() {
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [email, setEmail] = useState("");
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [invitationToken, setInvitationToken] = useState<string | null>(null);
  const [farmFeedback, setFarmFeedback] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [issueDrafts, setIssueDrafts] = useState<Record<string, IssueDraft>>({});
  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [canCreateFarm, setCanCreateFarm] = useState(false);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [informationRefreshVersion, setInformationRefreshVersion] = useState(0);
  const [isRefreshingInformation, setIsRefreshingInformation] = useState(false);
  const [weatherRefreshVersion, setWeatherRefreshVersion] = useState(0);
  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [farmCollaboration, setFarmCollaboration] = useState<FarmCollaboration | null>(null);
  const [isLoadingFarmCollaboration, setIsLoadingFarmCollaboration] = useState(false);
  const [isSavingFarmCollaboration, setIsSavingFarmCollaboration] = useState(false);
  const [farmCollaborationFeedback, setFarmCollaborationFeedback] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteEmail, setLatestInviteEmail] = useState<string | null>(null);
  const [farmAreas, setFarmAreas] = useState<FarmArea[]>([]);
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [cropCycle, setCropCycle] = useState<CropCycle | null>(null);
  const [growthStageDraft, setGrowthStageDraft] = useState("");
  const [isUpdatingGrowthStage, setIsUpdatingGrowthStage] = useState(false);
  const [isEndingCropCycle, setIsEndingCropCycle] = useState(false);
  const [schedule, setSchedule] = useState<FarmTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<FarmTask[]>([]);
  const [taskDetail, setTaskDetail] = useState<TaskDetail | null>(null);
  const [loadingTaskDetailId, setLoadingTaskDetailId] = useState<string | null>(null);
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [updatingTaskAssigneeId, setUpdatingTaskAssigneeId] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [issueStatusDrafts, setIssueStatusDrafts] = useState<Record<string, IssueStatus>>({});
  const [updatingIssueId, setUpdatingIssueId] = useState<string | null>(null);
  const [attachmentTarget, setAttachmentTarget] = useState<AttachmentTarget | null>(null);
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [isUploadingAttachment, setIsUploadingAttachment] = useState(false);
  const attachmentInputRef = useRef<HTMLInputElement>(null);
  const invitationAcceptanceAttempted = useRef(false);
  const farmListRequestVersion = useRef(0);
  const selectedContextRestorationAttempted = useRef<string | null>(null);
  const restoreFarmContextRef = useRef<((selectedFarm: Farm) => Promise<CropCycle[]>) | null>(null);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isRestoringContext, setIsRestoringContext] = useState(false);
  const [isMeasurementExpanded, setIsMeasurementExpanded] = useState(false);
  const [activeAppSection, setActiveAppSection] = useState<AppSection>("home");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedFarmId = farm?.id;
  const canManageSelectedFarm =
    farmCollaboration?.actorRole === "owner" || farmCollaboration?.actorRole === "admin";
  const shouldShowFarmCreation = canCreateFarm && !farm;
  const latestInviteEmailComposeUrl =
    farm && latestInviteEmail && latestInviteUrl
      ? createFarmInvitationEmailComposeUrl({
          farmName: farm.name,
          inviteUrl: latestInviteUrl,
          recipientEmail: latestInviteEmail,
        })
      : null;
  const restoreSavedContext = useEffectEvent(
    async ({
      isActive,
      savedContext,
      savedFarm,
      userId: restoringUserId,
    }: {
      isActive: () => boolean;
      savedContext: SelectedContext;
      savedFarm: Farm;
      userId: string;
    }) => {
      const cropCycleItems = await restoreFarmContext(savedFarm);
      if (!isActive()) return;

      const savedCropCycle = savedContext.cropCycleId
        ? cropCycleItems.find((item) => item.id === savedContext.cropCycleId)
        : null;

      if (!savedCropCycle) {
        saveSelectedContext(restoringUserId, savedFarm.id, null);
        setActiveAppSection("farm");
        setMessage(`${savedFarm.name}을 다시 열었습니다. 재배 중인 작물을 선택해 주세요.`);
        return;
      }

      await restoreCropCycleContext(savedCropCycle, savedFarm);
      if (isActive()) {
        setMessage(`${savedFarm.name}의 이전 화면을 이어서 열었습니다.`);
      }
    },
  );

  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let isMounted = true;

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (isMounted) {
        setUserEmail(user?.email ?? null);
        setUserId(user?.id ?? null);
        setInvitationToken(new URLSearchParams(window.location.search).get("invite"));
        setIsAuthLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setUserEmail(session?.user.email ?? null);
        setUserId(session?.user.id ?? null);
        setIsAuthLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    let isMounted = true;

    async function loadFarms() {
      const requestVersion = ++farmListRequestVersion.current;
      try {
        const result = await apiRequest<FarmListResponse>("/api/farms", { method: "GET" });
        if (isMounted && requestVersion === farmListRequestVersion.current) {
          setFarms(result.items);
          setCanCreateFarm(result.permissions.canCreateFarm);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "농장 목록을 불러오지 못했습니다.");
        }
      }
    }

    void loadFarms();

    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  useEffect(() => {
    if (!userId || farms.length === 0 || farm) {
      return;
    }

    const storageKey = selectedContextStorageKey(userId);
    if (selectedContextRestorationAttempted.current === storageKey) {
      return;
    }
    selectedContextRestorationAttempted.current = storageKey;

    const savedContext = readSelectedContext(userId);
    if (!savedContext) {
      return;
    }

    const savedFarm = farms.find((item) => item.id === savedContext.farmId);
    if (!savedFarm) {
      clearSelectedContext(userId);
      return;
    }

    const contextToRestore = savedContext;
    const farmToRestore = savedFarm;
    const restoringUserId = userId;
    let active = true;

    async function restoreSelectedContext() {
      try {
        await restoreSavedContext({
          isActive: () => active,
          savedContext: contextToRestore,
          savedFarm: farmToRestore,
          userId: restoringUserId,
        });
      } catch {
        if (active) {
          clearSelectedContext(userId);
          setMessage("이전에 열었던 농장을 불러오지 못했습니다. 목록에서 다시 선택해 주세요.");
        }
      }
    }

    void restoreSelectedContext();

    return () => {
      active = false;
    };
  }, [farm, farms, userId]);

  useEffect(() => {
    restoreFarmContextRef.current = restoreFarmContext;
  });

  useEffect(() => {
    if (!userEmail || invitationAcceptanceAttempted.current) {
      return;
    }

    if (!invitationToken) {
      return;
    }

    invitationAcceptanceAttempted.current = true;

    async function acceptInvitation() {
      let accepted: { farmId: string; role: Exclude<FarmRole, "owner"> };
      try {
        accepted = await apiRequest<{ farmId: string; role: Exclude<FarmRole, "owner"> }>(
          "/api/farm-invitations/accept",
          { method: "POST", body: JSON.stringify({ token: invitationToken }) },
        );
      } catch (error) {
        invitationAcceptanceAttempted.current = false;
        const errorMessage = error instanceof Error ? error.message : "농장 초대를 수락하지 못했습니다.";
        setMessage(`${errorMessage} 초대받은 이메일로 다시 로그인한 뒤 이 링크를 다시 열어 주세요.`);
        return;
      }

      window.history.replaceState({}, "", removeFarmInvitationToken(window.location.href));
      setInvitationToken(null);

      const requestVersion = ++farmListRequestVersion.current;
      try {
        const farmsResult = await apiRequest<FarmListResponse>("/api/farms", { method: "GET" });
        if (requestVersion !== farmListRequestVersion.current) {
          return;
        }

        setFarms(farmsResult.items);
        setCanCreateFarm(farmsResult.permissions.canCreateFarm);
        const acceptedFarm = farmsResult.items.find((item) => item.id === accepted.farmId);
        if (!acceptedFarm) {
          setMessage(`농장 초대를 수락했습니다. ${farmRoleLabel(accepted.role)} 역할로 농장 목록에서 선택해 시작하세요.`);
          return;
        }

        const restoreFarmContext = restoreFarmContextRef.current;
        if (!restoreFarmContext) {
          throw new Error("농장 정보를 다시 불러오지 못했습니다.");
        }

        const cropCycleItems = await restoreFarmContext(acceptedFarm);
        saveSelectedContext(userId, acceptedFarm.id, null);
        setMessage(
          `농장 초대를 수락했습니다. ${farmRoleLabel(accepted.role)} 역할로 ${acceptedFarm.name}을 열었습니다. ${
            cropCycleItems.length > 0 ? "재배 중인 작물을 선택해 일정을 이어서 보세요." : "새 작기를 만들 수 있습니다."
          }`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "농장 정보를 불러오지 못했습니다.";
        setMessage(`농장 초대는 수락했습니다. ${errorMessage} 새로고침한 뒤 농장을 선택해 주세요.`);
      }
    }

    void acceptInvitation();
  }, [invitationToken, userEmail, userId]);

  useEffect(() => {
    if (!selectedFarmId || !userEmail) {
      return;
    }

    let isMounted = true;

    async function loadFarmCollaboration() {
      setIsLoadingFarmCollaboration(true);
      try {
        const collaboration = await apiRequest<FarmCollaboration>(
          `/api/farms/${selectedFarmId}/collaboration`,
          { method: "GET" },
        );
        if (isMounted) {
          setFarmCollaboration(collaboration);
          setFarmCollaborationFeedback(null);
        }
      } catch (error) {
        if (isMounted) {
          setFarmCollaboration(null);
          setFarmCollaborationFeedback(
            error instanceof Error ? error.message : "농장 구성원 정보를 불러오지 못했습니다.",
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingFarmCollaboration(false);
        }
      }
    }

    void loadFarmCollaboration();

    return () => {
      isMounted = false;
    };
  }, [selectedFarmId, userEmail]);

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
      setMessage("로그인되었습니다. 농장을 선택하거나 새로 만들어 시작하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "로그인에 실패했습니다.");
    } finally {
      setIsAuthenticating(false);
    }
  }

  async function handleInvitationAccountSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const parsed = parseInvitationAccountSetupInput({
      email: form.get("inviteAccountEmail"),
      password: form.get("inviteAccountPassword"),
      passwordConfirmation: form.get("inviteAccountPasswordConfirmation"),
    });

    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }

    setIsAuthenticating(true);
    setMessage("");
    try {
      const { data, error } = await createBrowserSupabaseClient().auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
      });
      if (error) {
        throw error;
      }

      setEmail(parsed.data.email);
      setMessage(
        data.session
          ? "계정을 설정했습니다. 농장 초대를 수락하는 중입니다."
          : "계정 설정 요청을 받았습니다. 이메일 인증이 켜져 있다면 인증을 완료한 뒤 이 초대 링크를 다시 열어 주세요. 이미 계정이 있다면 아래 로그인으로 진행하세요.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "계정을 설정하지 못했습니다.");
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
      clearSelectedContext(userId);
      setFarms([]);
      setCanCreateFarm(false);
      setFarm(null);
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setFarmAreas([]);
      setCropCycles([]);
      setCropCycle(null);
      setGrowthStageDraft("");
      setSchedule([]);
      setTodayTasks([]);
      setTaskDetail(null);
      setLoadingTaskDetailId(null);
      setFarmFeedback(null);
      setActionNotes({});
      setIssueDrafts({});
      setHistory([]);
      setSelectedIssue(null);
      setIssueStatusDrafts({});
      setAttachmentTarget(null);
      setAttachmentFile(null);
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
    setFarmFeedback("농장을 만들고 있습니다.");

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
      saveSelectedContext(userId, created.id, null);
      setActiveAppSection("farm");
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setFarms((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setFarmAreas([]);
      setCropCycles([]);
      setCropCycle(null);
      setGrowthStageDraft("");
      setSchedule([]);
      setTodayTasks([]);
      setTaskDetail(null);
      setLoadingTaskDetailId(null);
      setHistory([]);
      setSelectedIssue(null);
      setIssueStatusDrafts({});
      setAttachmentTarget(null);
      setAttachmentFile(null);
      setMessage(`농장 “${created.name}”을 만들었습니다.`);
      setFarmFeedback(`농장 “${created.name}”이 생성되었습니다.`);
    } catch (error) {
      const errorText = error instanceof Error ? error.message : "농장 생성에 실패했습니다.";
      setMessage(errorText);
      setFarmFeedback(errorText);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleFarmUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsUpdatingFarm(true);
    try {
      const updated = await apiRequest<Farm>(`/api/farms/${farm.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: form.get("name"),
          regionCode: form.get("regionCode"),
          cultivationEnvironment: form.get("cultivationEnvironment"),
          cultivationMethod: form.get("cultivationMethod"),
        }),
      });
      setFarm(updated);
      setFarms((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`농장 “${updated.name}” 기본정보를 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "농장 기본정보 저장에 실패했습니다.");
    } finally {
      setIsUpdatingFarm(false);
    }
  }

  async function refreshFarmCollaboration() {
    if (!farm) {
      return;
    }

    const collaboration = await apiRequest<FarmCollaboration>(`/api/farms/${farm.id}/collaboration`, {
      method: "GET",
    });
    setFarmCollaboration(collaboration);
  }

  async function handleFarmInvitationCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm) {
      return;
    }

    const form = new FormData(event.currentTarget);
    setIsSavingFarmCollaboration(true);
    try {
      const invitation = await apiRequest<FarmInvitationResponse>(`/api/farms/${farm.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: form.get("inviteEmail"), role: form.get("inviteRole") }),
      });
      setLatestInviteUrl(invitation.inviteUrl);
      setLatestInviteEmail(invitation.email);
      await refreshFarmCollaboration();
      setFarmCollaborationFeedback(
        `${invitation.email}에게 보낼 초대 링크를 만들었습니다. 만료 전까지 링크를 직접 전달하세요.`,
      );
    } catch (error) {
      setFarmCollaborationFeedback(
        error instanceof Error ? error.message : "농장 초대 링크를 만들지 못했습니다.",
      );
    } finally {
      setIsSavingFarmCollaboration(false);
    }
  }

  async function handleFarmMemberRoleChange(memberUserId: string, role: Exclude<FarmRole, "owner">) {
    if (!farm) {
      return;
    }

    setIsSavingFarmCollaboration(true);
    try {
      await apiRequest(`/api/farms/${farm.id}/members/${memberUserId}`, {
        method: "PATCH",
        body: JSON.stringify({ role }),
      });
      await refreshFarmCollaboration();
      setFarmCollaborationFeedback("구성원 역할을 변경했습니다.");
    } catch (error) {
      setFarmCollaborationFeedback(
        error instanceof Error ? error.message : "구성원 역할을 변경하지 못했습니다.",
      );
    } finally {
      setIsSavingFarmCollaboration(false);
    }
  }

  async function handleFarmMemberRemove(member: FarmMember) {
    if (!farm || !window.confirm(`${member.email} 구성원을 Farm에서 제거할까요?`)) {
      return;
    }

    setIsSavingFarmCollaboration(true);
    try {
      await apiRequest(`/api/farms/${farm.id}/members/${member.userId}`, { method: "DELETE" });
      await refreshFarmCollaboration();
      setFarmCollaborationFeedback(`${member.email} 구성원을 제거했습니다.`);
    } catch (error) {
      setFarmCollaborationFeedback(
        error instanceof Error ? error.message : "구성원을 제거하지 못했습니다.",
      );
    } finally {
      setIsSavingFarmCollaboration(false);
    }
  }

  async function handleFarmInvitationRevoke(invitation: FarmInvitation) {
    if (!farm || !window.confirm(`${invitation.email}에게 보낸 초대를 취소할까요?`)) {
      return;
    }

    setIsSavingFarmCollaboration(true);
    try {
      await apiRequest(`/api/farms/${farm.id}/invitations/${invitation.id}`, { method: "DELETE" });
      if (latestInviteUrl) {
        setLatestInviteUrl(null);
      }
      setLatestInviteEmail(null);
      await refreshFarmCollaboration();
      setFarmCollaborationFeedback(`${invitation.email} 초대를 취소했습니다.`);
    } catch (error) {
      setFarmCollaborationFeedback(
        error instanceof Error ? error.message : "초대를 취소하지 못했습니다.",
      );
    } finally {
      setIsSavingFarmCollaboration(false);
    }
  }

  async function handleFarmInvitationRegenerate(invitation: FarmInvitation) {
    if (
      !farm ||
      !window.confirm(
        `${invitation.email}에게 보낼 새 초대 링크를 만들까요? 이전 링크는 즉시 사용할 수 없게 됩니다.`,
      )
    ) {
      return;
    }

    setIsSavingFarmCollaboration(true);
    try {
      const regeneratedInvitation = await apiRequest<FarmInvitationResponse>(`/api/farms/${farm.id}/invitations`, {
        method: "POST",
        body: JSON.stringify({ email: invitation.email, role: invitation.role }),
      });
      setLatestInviteUrl(regeneratedInvitation.inviteUrl);
      setLatestInviteEmail(regeneratedInvitation.email);
      await refreshFarmCollaboration();
      setFarmCollaborationFeedback(
        `${regeneratedInvitation.email}의 새 초대 링크를 만들었습니다. 이전 링크는 더 이상 사용할 수 없습니다.`,
      );
    } catch (error) {
      setFarmCollaborationFeedback(
        error instanceof Error ? error.message : "새 초대 링크를 만들지 못했습니다.",
      );
    } finally {
      setIsSavingFarmCollaboration(false);
    }
  }

  async function handleInvitationLinkCopy() {
    if (!latestInviteUrl) {
      return;
    }

    if (await copyFarmInvitationLink(navigator, latestInviteUrl)) {
      setFarmCollaborationFeedback("초대 링크를 클립보드에 복사했습니다.");
    } else {
      setFarmCollaborationFeedback("초대 링크를 직접 선택해 복사하세요.");
    }
  }

  async function handleInvitationLinkShare() {
    if (!latestInviteUrl) {
      return;
    }

    const result = await shareFarmInvitationLink(navigator, latestInviteUrl);
    if (result === "shared") {
      setFarmCollaborationFeedback("초대 링크 공유를 완료했습니다.");
    } else if (result === "cancelled") {
      setFarmCollaborationFeedback("초대 링크 공유를 취소했습니다. 링크는 아래에서 계속 복사할 수 있습니다.");
    } else if (result === "copied") {
      setFarmCollaborationFeedback("공유 기능을 사용할 수 없어 초대 링크를 클립보드에 복사했습니다.");
    } else {
      setFarmCollaborationFeedback("공유 기능을 사용할 수 없습니다. 링크를 직접 선택해 복사하세요.");
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
          farmAreaId: form.get("farmAreaId") || null,
          transplantDate: form.get("transplantDate"),
          growthStage: form.get("growthStage"),
        }),
      });
      setCropCycle(created);
      saveSelectedContext(userId, farm.id, created.id);
      setActiveAppSection("home");
      setCropCycles((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setGrowthStageDraft(created.growthStage ?? "");
      setSchedule([]);
      setTodayTasks([]);
      setTaskDetail(null);
      setLoadingTaskDetailId(null);
      setHistory([]);
      setSelectedIssue(null);
      setIssueStatusDrafts({});
      setAttachmentTarget(null);
      setAttachmentFile(null);
      setMessage("재배 작기를 만들었습니다. 기본 작업을 만들어 계획을 시작하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "재배 작기 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGrowthStageUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cropCycle) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const farmAreaId = form.get("farmAreaId");
    setIsUpdatingGrowthStage(true);
    try {
      const updated = await apiRequest<CropCycle>(`/api/crop-cycles/${cropCycle.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          growthStage: growthStageDraft,
          farmAreaId: typeof farmAreaId === "string" && farmAreaId.length > 0 ? farmAreaId : null,
        }),
      });
      setCropCycle(updated);
      setCropCycles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setGrowthStageDraft(updated.growthStage ?? "");
      const areaLabel = updated.farmAreaId
        ? farmAreas.find((area) => area.id === updated.farmAreaId)?.name ?? "선택한 재배 구역"
        : "미지정";
      setMessage(
        `${updated.growthStage ? `현재 생육 단계를 “${updated.growthStage}”로 저장했습니다.` : "현재 생육 단계 설정을 비웠습니다."} 주 재배 구역: ${areaLabel}.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "생육 단계 저장에 실패했습니다.");
    } finally {
      setIsUpdatingGrowthStage(false);
    }
  }

  async function handleCropCycleEnd(status: CropCycleTerminalStatus) {
    if (!cropCycle) {
      return;
    }

    const statusLabel = status === "completed" ? "완료" : "취소";
    if (!window.confirm(`이 작기를 ${statusLabel} 처리할까요? 종료한 작기에는 새 작업 계획을 만들 수 없습니다.`)) {
      return;
    }

    setIsEndingCropCycle(true);
    try {
      const updated = await apiRequest<CropCycle>(`/api/crop-cycles/${cropCycle.id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setCropCycle(updated);
      setCropCycles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setMessage(`작기를 ${statusLabel} 처리했습니다. 기존 일정과 기록은 그대로 보관됩니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작기 상태 저장에 실패했습니다.");
    } finally {
      setIsEndingCropCycle(false);
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

  async function loadTaskDetail(taskId: string) {
    setLoadingTaskDetailId(taskId);
    try {
      const detail = await apiRequest<TaskDetail>(`/api/tasks/${taskId}`, { method: "GET" });
      setTaskDetail(detail);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 상세를 불러오지 못했습니다.");
    } finally {
      setLoadingTaskDetailId(null);
    }
  }

  async function handleTaskDetailSelect(taskId: string) {
    await loadTaskDetail(taskId);
    window.requestAnimationFrame(() => {
      document.getElementById("task-detail-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  async function loadHistory(farmId: string) {
    const result = await apiRequest<{ items: HistoryItem[] }>(`/api/farms/${farmId}/history`, {
      method: "GET",
    });
    setHistory(result.items);
  }

  async function loadCropCycles(farmId: string) {
    const result = await apiRequest<{ items: CropCycle[] }>(`/api/farms/${farmId}/crop-cycles`, {
      method: "GET",
    });
    setCropCycles(result.items);
    return result.items;
  }

  async function loadFarmAreas(farmId: string) {
    const result = await apiRequest<{ items: FarmArea[] }>(`/api/farms/${farmId}/areas`, {
      method: "GET",
    });
    setFarmAreas(result.items);
    return result.items;
  }

  function clearCropCycleContext() {
    setCropCycle(null);
    setGrowthStageDraft("");
    setSchedule([]);
    setTaskDetail(null);
    setLoadingTaskDetailId(null);
    setActionNotes({});
    setIssueDrafts({});
    setRecordingTaskId(null);
    setSelectedIssue(null);
    setIssueStatusDrafts({});
    setAttachmentTarget(null);
    setAttachmentFile(null);
  }

  async function restoreFarmContext(selectedFarm: Farm): Promise<CropCycle[]> {
    setIsRestoringContext(true);
    setFarm(selectedFarm);
    setFarmFeedback(null);
    setFarmCollaboration(null);
    setFarmCollaborationFeedback(null);
    setLatestInviteUrl(null);
    setLatestInviteEmail(null);
    clearCropCycleContext();
    setTodayTasks([]);
    setHistory([]);
    setFarmAreas([]);
    try {
      const cropCycleItems = await loadCropCycles(selectedFarm.id);
      await Promise.all([loadFarmAreas(selectedFarm.id), loadTodayTasks(selectedFarm.id), loadHistory(selectedFarm.id)]);
      return cropCycleItems;
    } finally {
      setIsRestoringContext(false);
    }
  }

  async function handleSavedFarmSelect(farmId: string) {
    const selectedFarm = farms.find((item) => item.id === farmId);
    if (!selectedFarm) {
      clearSelectedContext(userId);
      setFarm(null);
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setFarmAreas([]);
      setCropCycles([]);
      clearCropCycleContext();
      setTodayTasks([]);
      setHistory([]);
      return;
    }

    try {
      const cropCycleItems = await restoreFarmContext(selectedFarm);
      saveSelectedContext(userId, selectedFarm.id, null);
      setActiveAppSection("farm");
      setMessage(
        `${selectedFarm.name}을 열었습니다. ${cropCycleItems.length > 0 ? "재배 중인 작물을 선택해 일정을 이어서 보세요." : "새 작기를 만들 수 있습니다."}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장된 농장 정보를 불러오지 못했습니다.");
    }
  }

  async function restoreCropCycleContext(selectedCropCycle: CropCycle, selectedFarm: Farm) {
    setIsRestoringContext(true);
    setCropCycle(selectedCropCycle);
    setActiveAppSection("home");
    setGrowthStageDraft(selectedCropCycle.growthStage ?? "");
    setSchedule([]);
    setTaskDetail(null);
    setLoadingTaskDetailId(null);
    setSelectedIssue(null);
    setIssueStatusDrafts({});
    setAttachmentTarget(null);
    setAttachmentFile(null);
    try {
      await Promise.all([
        loadSchedule(selectedCropCycle.id),
        loadTodayTasks(selectedFarm.id),
        loadHistory(selectedFarm.id),
      ]);
    } catch (error) {
      throw error instanceof Error ? error : new Error("저장된 작기 정보를 불러오지 못했습니다.");
    } finally {
      setIsRestoringContext(false);
    }
  }

  async function handleSavedCropCycleSelect(cropCycleId: string) {
    const selectedCropCycle = cropCycles.find((item) => item.id === cropCycleId);
    if (!selectedCropCycle || !farm) {
      clearCropCycleContext();
      if (farm) saveSelectedContext(userId, farm.id, null);
      return;
    }

    try {
      await restoreCropCycleContext(selectedCropCycle, farm);
      saveSelectedContext(userId, farm.id, selectedCropCycle.id);
      setMessage(`${selectedCropCycle.cropCode} 작기의 기존 일정과 기록을 불러왔습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장된 작기 정보를 불러오지 못했습니다.");
    }
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
          ? `작기 전체에 기본 작업 ${generated.generatedCount}개를 만들었습니다.`
          : "새로 만들 작업이 없습니다. 기존 작업 계획은 그대로 유지됩니다.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업계획 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleManualTaskCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cropCycle || !farm) {
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    setIsSubmitting(true);
    try {
      const created = await apiRequest<{ farmTask: FarmTask }>(`/api/crop-cycles/${cropCycle.id}/tasks`, {
        method: "POST",
        body: JSON.stringify({
          title: form.get("title"),
          reason: form.get("reason"),
          farmAreaId: form.get("farmAreaId") || null,
          scheduledFor: form.get("scheduledFor"),
          priority: form.get("priority"),
        }),
      });
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      formElement.reset();
      setMessage(`직접 등록한 작업 “${created.farmTask.title}”을 일정에 추가했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "직접 작업 등록에 실패했습니다.");
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
      setMessage("일정, 오늘 할 일, 이력을 새로고침했습니다.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "조회에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleInformationRefresh() {
    setIsRefreshingInformation(true);
    setInformationRefreshVersion((value) => value + 1);
    window.setTimeout(() => setIsRefreshingInformation(false), 400);
    setMessage("참고정보를 다시 불러왔습니다. 각 카드의 확인 시각과 상태를 확인해 주세요.");
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

  function issueStatusDraftFor(issueId: string, status: IssueStatus) {
    return issueStatusDrafts[issueId] ?? status;
  }

  async function handleIssueStatusUpdate(issue: { id: string; status: IssueStatus; taskTitle: string }) {
    if (!farm) {
      return;
    }

    const nextStatus = issueStatusDraftFor(issue.id, issue.status);
    setUpdatingIssueId(issue.id);
    try {
      const updated = await apiRequest<{ issue: { id: string; status: IssueStatus; resolvedAt: string | null } }>(
        `/api/issues/${issue.id}`,
        {
          method: "PATCH",
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      await loadHistory(farm.id);
      setIssueStatusDrafts((drafts) => {
        const nextDrafts = { ...drafts };
        delete nextDrafts[updated.issue.id];
        return nextDrafts;
      });
      setSelectedIssue((current) => {
        if (current?.id !== updated.issue.id) {
          return current;
        }

        return updated.issue.status === "open" || updated.issue.status === "needs_review"
          ? { ...current, status: updated.issue.status }
          : null;
      });
      setMessage(`${issue.taskTitle}의 문제 상태를 ${issueStatusLabel(updated.issue.status)}로 변경했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "문제 상태 변경에 실패했습니다.");
    } finally {
      setUpdatingIssueId(null);
    }
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
      setTaskDetail(null);
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
        setAttachmentTarget({ id: recorded.issue.id, kind: "issue", taskTitle: task.title });
      } else if (actionType !== "started") {
        setAttachmentTarget({ id: recorded.actionLog.id, kind: "action_log", taskTitle: task.title });
      } else {
        setAttachmentTarget(null);
      }
      setMessage(
        actionType === "started"
          ? "작업을 시작했습니다. 오늘 화면에서 진행 중 상태를 계속 확인할 수 있습니다."
          : actionType === "completed"
          ? "완료 결과를 기록했습니다. 작업이 오늘 목록에서 제외되었습니다."
          : actionType === "not_checked"
            ? "확인하지 못함을 기록했습니다. 작업은 다시 확인할 수 있도록 오늘 목록에 남아 있습니다."
            : "관찰한 문제를 기록했습니다. 원본 작업은 문제 기록 상태가 되었고, 필요하면 재확인 작업을 만드세요.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 결과 기록에 실패했습니다.");
    } finally {
      setRecordingTaskId(null);
      setIsSubmitting(false);
    }
  }

  async function handleTaskCancellation(task: TaskDetail) {
    if (!farm || !cropCycle) {
      return;
    }

    if (!window.confirm(`“${task.title}” 작업을 취소할까요? 취소된 작업은 일정에 보존되지만 Today에서는 제외됩니다.`)) {
      return;
    }

    setIsSubmitting(true);
    setCancellingTaskId(task.id);
    try {
      const cancelled = await apiRequest<TaskDetail>(`/api/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled" }),
      });
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id), loadHistory(farm.id)]);
      setTaskDetail(cancelled);
      setMessage(`“${task.title}” 작업을 취소했습니다. 취소된 작업은 전체 일정에서 확인할 수 있습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 취소에 실패했습니다.");
    } finally {
      setCancellingTaskId(null);
      setIsSubmitting(false);
    }
  }

  function taskAssigneeLabel(assignedUserId: string | null) {
    if (!assignedUserId) {
      return "미배정";
    }

    if (assignedUserId === userId) {
      return "내 담당";
    }

    const member = farmCollaboration?.members.find((item) => item.userId === assignedUserId);
    return member?.email ?? "팀원 배정됨";
  }

  async function handleTaskAssigneeUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!farm || !cropCycle || !taskDetail) {
      return;
    }

    const form = new FormData(event.currentTarget);
    const selectedUserId = form.get("assignedUserId");
    const assignedUserId = typeof selectedUserId === "string" && selectedUserId.length > 0 ? selectedUserId : null;
    if (assignedUserId === taskDetail.assignedUserId) {
      setMessage("담당자 변경 사항이 없습니다.");
      return;
    }

    setIsSubmitting(true);
    setUpdatingTaskAssigneeId(taskDetail.id);
    try {
      const updated = await apiRequest<TaskAssignmentResponse>(`/api/tasks/${taskDetail.id}/assignee`, {
        method: "PATCH",
        body: JSON.stringify({ assignedUserId }),
      });
      await Promise.all([loadSchedule(cropCycle.id), loadTodayTasks(farm.id)]);
      setTaskDetail((current) =>
        current?.id === updated.task.id ? { ...current, assignedUserId: updated.task.assignedUserId } : current,
      );
      setMessage(
        updated.task.assignedUserId
          ? `“${taskDetail.title}” 작업의 담당자를 ${taskAssigneeLabel(updated.task.assignedUserId)}으로 지정했습니다.`
          : `“${taskDetail.title}” 작업의 담당자 배정을 해제했습니다.`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "작업 담당자 저장에 실패했습니다.");
    } finally {
      setUpdatingTaskAssigneeId(null);
      setIsSubmitting(false);
    }
  }

  async function handleAttachmentUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!attachmentTarget || !attachmentFile || !farm) {
      return;
    }

    setIsUploadingAttachment(true);
    try {
      const form = new FormData();
      form.append("file", attachmentFile);
      const targetPath =
        attachmentTarget.kind === "issue"
          ? `/api/issues/${attachmentTarget.id}/attachments`
          : `/api/action-logs/${attachmentTarget.id}/attachments`;
      const response = await fetch(targetPath, { method: "POST", body: form });
      const data: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(errorMessage(data));
      }
      await loadHistory(farm.id);
      setAttachmentFile(null);
      if (attachmentInputRef.current) {
        attachmentInputRef.current.value = "";
      }
      setMessage("사진을 비공개 이력에 첨부했습니다.");
    } catch (error) {
      setMessage(
        `${error instanceof Error ? error.message : "사진 업로드에 실패했습니다."} 결과·문제 기록은 그대로 유지됩니다.`,
      );
    } finally {
      setIsUploadingAttachment(false);
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
      setMessage(`${created.farmTask.title} 작업을 만들었습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "재확인 작업 생성에 실패했습니다.");
    } finally {
      setIsCreatingFollowUp(false);
    }
  }

  const transplantDate = seoulDateInputValue();
  const dashboardIssues = history.flatMap((item) =>
    item.kind === "issue" && item.cropCycleId === cropCycle?.id
      ? [
          {
            id: item.issueId,
            severity: item.severity,
            status: item.status,
          },
        ]
      : [],
  );
  const hasSelectedWorkCycle = Boolean(userEmail && farm && cropCycle);

  function handleAppNavigation(section: AppSection) {
    setActiveAppSection(section);
    window.scrollTo({ behavior: "smooth", top: 0 });
  }

  return (
    <main className={hasSelectedWorkCycle ? "page-shell page-shell-with-navigation" : "page-shell"}>
      {!hasSelectedWorkCycle ? <header className="hero stack">
        <p className="eyebrow">dreAmIng Smart Farm</p>
        <h1>{farm ? `${farm.name} 관리` : "농장 관리"}</h1>
        <p>{cropCycle ? "오늘 해야 할 일과 현장 기록을 먼저 확인하세요." : "농장과 작기를 선택해 오늘 해야 할 일을 확인하세요."}</p>
        <p className="draft-notice">
          현재 작업 계획은 개발·검증용 데이터이며 실제 농업 처방이 아닙니다.
        </p>
      </header> : null}

      {isAuthLoading ? <p className="status">인증 상태를 확인하고 있습니다.</p> : null}

      {!isAuthLoading && !userEmail && invitationToken ? (
        <section className="card stack" aria-labelledby="invitation-account-heading">
          <h2 id="invitation-account-heading">농장 초대 수락</h2>
          <p className="muted">처음 참여한다면 이 화면에서 초대받은 이메일과 본인 비밀번호로 계정을 설정하세요.</p>
          <p className="field-hint">관리자에게 비밀번호를 받거나 전달할 필요가 없습니다. 초대받은 이메일과 정확히 같아야 합니다.</p>
          <form className="stack" onSubmit={handleInvitationAccountSetup}>
            <label>
              초대받은 이메일
              <input
                autoComplete="email"
                name="inviteAccountEmail"
                onChange={(event) => setEmail(event.target.value)}
                required
                type="email"
                value={email}
              />
            </label>
            <label>
              비밀번호
              <input
                autoComplete="new-password"
                minLength={8}
                name="inviteAccountPassword"
                required
                type="password"
              />
            </label>
            <label>
              비밀번호 확인
              <input
                autoComplete="new-password"
                minLength={8}
                name="inviteAccountPasswordConfirmation"
                required
                type="password"
              />
            </label>
            <button disabled={isAuthenticating} type="submit">
              {isAuthenticating ? "계정 설정 중..." : "계정 설정 후 농장 참여"}
            </button>
          </form>
          <details className="stack">
            <summary>이미 계정이 있나요?</summary>
            <p className="field-hint">초대받은 동일 이메일로 로그인하면 농장 초대가 자동 수락됩니다.</p>
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
              <button className="secondary" disabled={isAuthenticating} type="submit">
                이메일로 로그인
              </button>
            </form>
          </details>
        </section>
      ) : null}

      {!isAuthLoading && !userEmail && !invitationToken ? (
        <section className="card stack" aria-labelledby="sign-in-heading">
          <h2 id="sign-in-heading">로그인</h2>
          <p className="muted">등록한 이메일과 비밀번호로 로그인하세요.</p>
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

      {!isAuthLoading && userEmail && (!hasSelectedWorkCycle || activeAppSection === "farm") ? (
        <div className="session-row">
          <span>{userEmail}로 로그인됨</span>
          <button className="secondary compact" disabled={isAuthenticating} onClick={handleSignOut} type="button">
            로그아웃
          </button>
        </div>
      ) : null}

      {message ? <p className="status" role="status">{message}</p> : null}

      {userEmail && (!farm || !cropCycle) ? (
        <WorkCycleGuidance
          canCreateFarm={canCreateFarm}
          canManageFarm={canManageSelectedFarm}
          cropCycleStatus={cropCycle?.status ?? null}
          hasAvailableFarm={farms.length > 0}
          hasFarm={Boolean(farm)}
          hasScheduledTasks={schedule.length > 0}
          overdueTaskCount={todayTasks.filter((task) => task.scheduleState === "overdue").length}
          todayTaskCount={todayTasks.filter((task) => task.scheduleState !== "overdue").length}
        />
      ) : null}

      {userEmail && (!hasSelectedWorkCycle || activeAppSection === "farm") ? (
        <section className="card saved-context stack" aria-labelledby="saved-context-heading">
          <details className="dashboard-context-switcher" open={!farm || !cropCycle}>
            <summary id="saved-context-heading">{farm && cropCycle ? `${farm.name} · ${cropCycle.cropCode}${cropCycle.cultivar ? ` ${cropCycle.cultivar}` : ""} 바꾸기` : "관리할 농장과 작기 선택"}</summary>
            <p className="field-hint">
              선택한 농장과 작기는 이 탭을 새로고침해도 다시 열립니다. 작업 계획은 자동으로 다시 생성하지 않습니다.
            </p>
          <label>
            농장 선택
            <select
              disabled={isRestoringContext}
              onChange={(event) => void handleSavedFarmSelect(event.target.value)}
              value={farm?.id ?? ""}
            >
              <option value="">농장을 선택하세요</option>
              {farms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.regionCode}
                </option>
              ))}
            </select>
          </label>
          {farm ? (
            <label>
              작기 선택
              <select
                disabled={isRestoringContext}
                onChange={(event) => void handleSavedCropCycleSelect(event.target.value)}
                value={cropCycle?.id ?? ""}
              >
                <option value="">작기를 선택하세요</option>
                {cropCycles.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.cropCode}
                    {item.cultivar ? ` · ${item.cultivar}` : ""} · {item.transplantDate} · {cropCycleStatusLabel(item.status)}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
          {isRestoringContext ? <small className="field-hint">저장된 데이터를 불러오는 중입니다.</small> : null}
          </details>
        </section>
      ) : null}

      {userEmail && farm && !cropCycle ? (
        <WeatherCard
          canConfigure={canManageSelectedFarm}
          farmId={farm.id}
          key={`${farm.id}:${weatherRefreshVersion}`}
          standalone
        />
      ) : null}

      {userEmail && farm && cropCycle && activeAppSection === "home" ? (
        <TodayHome
          cropCycle={cropCycle}
          farm={farm}
          hasScheduledTasks={schedule.length > 0}
          issues={dashboardIssues}
          loadingTaskId={loadingTaskDetailId}
          onNavigate={handleAppNavigation}
          onTaskSelect={(taskId) => void handleTaskDetailSelect(taskId)}
          tasks={todayTasks}
        />
      ) : null}

      {userEmail && farm && cropCycle && activeAppSection === "information" ? (
        <section className="information-page stack" aria-labelledby="information-heading">
          <div className="page-section-heading">
            <div>
              <p className="eyebrow">농장 정보</p>
              <h1 id="information-heading">오늘 참고정보</h1>
              <p>날씨와 공개 참고자료를 한 곳에서 확인하세요.</p>
            </div>
            <button disabled={isRefreshingInformation} onClick={handleInformationRefresh} type="button">
              {isRefreshingInformation ? "확인 중..." : "정보 다시 확인"}
            </button>
          </div>
          <div className="information-card-grid">
            <WeatherCard canConfigure={canManageSelectedFarm} farmId={farm.id} key={`${farm.id}:${weatherRefreshVersion}:${informationRefreshVersion}`} />
            <DiseasePestCard cropLabel={[cropCycle.cropCode, cropCycle.cultivar].filter(Boolean).join(" · ")} farmId={farm.id} key={`${farm.id}:disease-pest:${informationRefreshVersion}`} />
            <CropReferenceCard cropCycleId={cropCycle.id} cropLabel={[cropCycle.cropCode, cropCycle.cultivar].filter(Boolean).join(" · ")} farmId={farm.id} key={`${farm.id}:${cropCycle.id}:crop-reference:${informationRefreshVersion}`} />
            <MarketReferenceCard cropCycleId={cropCycle.id} cropLabel={[cropCycle.cropCode, cropCycle.cultivar].filter(Boolean).join(" · ")} farmId={farm.id} key={`${farm.id}:${cropCycle.id}:market-reference:${informationRefreshVersion}`} />
          </div>
        </section>
      ) : null}

      {userEmail && activeAppSection === "farm" ? (
        <FarmSetupProgress
          canManageFarm={canManageSelectedFarm}
          hasFarm={Boolean(farm)}
          hasScheduledTasks={schedule.length > 0}
          hasSelectedCropCycle={Boolean(cropCycle)}
        />
      ) : null}

      {userEmail && activeAppSection === "farm" && (canCreateFarm || farm) ? <section className="card farm-management-card stack" aria-labelledby="farm-heading">
        <div className="farm-management-heading">
          <div>
            <p className="eyebrow">기본 설정</p>
            <h2 id="farm-heading">{farm ? "농장 기본정보" : "농장 만들기"}</h2>
          </div>
          {farm ? <span>{farm.regionCode}</span> : null}
        </div>
        {canCreateFarm ? <details className="farm-create" open={shouldShowFarmCreation}>
        <summary>{farm ? "새 농장 추가" : "농장 기본정보 입력"}</summary>
        {farm ? <p className="field-hint">현재 선택한 농장과 별도로 새 농장을 등록합니다.</p> : null}
        <form className="stack" onSubmit={handleFarmCreate}>
          <label>
            농장명
            <input name="name" required defaultValue="개발용 농장" />
          </label>
          <label>
            농장 지역 구분
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
            {isSubmitting ? "농장 만드는 중..." : "농장 만들기"}
          </button>
        </form>
        </details> : null}
        {farmFeedback ? (
          <p className="inline-status" role="status">
            {farmFeedback}
          </p>
        ) : null}
        {farm ? (
          <>
          {canManageSelectedFarm ? (
          <details className="farm-settings">
            <summary>현재 농장 기본정보 수정</summary>
            <p className="field-hint">농장 기본정보만 변경합니다. 기존 작기, 작업, 결과와 이력은 바꾸지 않습니다.</p>
            <form className="stack" key={`${farm.id}:${farm.name}:${farm.regionCode}:${farm.cultivationEnvironment}:${farm.cultivationMethod ?? ""}`} onSubmit={handleFarmUpdate}>
              <label>
                농장명
                <input defaultValue={farm.name} name="name" required />
              </label>
              <label>
              농장 지역 구분
                <input defaultValue={farm.regionCode} name="regionCode" required />
              </label>
              <label>
                재배 환경
                <select defaultValue={farm.cultivationEnvironment} name="cultivationEnvironment">
                  <option value="facility">시설 재배</option>
                  <option value="open_field">노지 재배</option>
                </select>
              </label>
              <label>
                재배 방식 (선택)
                <input defaultValue={farm.cultivationMethod ?? ""} name="cultivationMethod" />
              </label>
              <button disabled={isUpdatingFarm} type="submit">
                {isUpdatingFarm ? "저장 중..." : "농장 기본정보 저장"}
              </button>
            </form>
          </details>
          ) : (
            <p className="field-hint">작업자는 공유된 농장 정보를 조회하고 오늘 작업 결과를 기록할 수 있습니다. 농장 기본정보와 작업 계획은 소유자 또는 관리자가 관리합니다.</p>
          )}
          <details className="farm-collaboration">
            <summary>농장 구성원과 초대 관리</summary>
            <p className="field-hint">
              자동 이메일은 보내지 않습니다. 만든 초대 링크를 복사해 해당 이메일의 팀원에게 직접 전달하세요.
            </p>
            {isLoadingFarmCollaboration ? <small className="field-hint">구성원 정보를 불러오는 중입니다.</small> : null}
            {farmCollaboration ? (
              <>
                <p className="muted">내 역할: {farmRoleLabel(farmCollaboration.actorRole)}</p>
                {farmCollaboration.actorRole === "farmer" ? (
                  <p className="field-hint">작업자는 공유된 농장 정보를 보고 작업을 기록할 수 있지만, 구성원과 초대는 관리할 수 없습니다.</p>
                ) : (
                  <>
                    <form className="stack" onSubmit={handleFarmInvitationCreate}>
                      <label>
                        초대할 이메일
                        <input autoComplete="email" name="inviteEmail" required type="email" />
                      </label>
                      <label>
                        초대 역할
                        <select defaultValue="farmer" name="inviteRole">
                          <option value="farmer">작업자</option>
                          {farmCollaboration.actorRole === "owner" ? <option value="admin">관리자</option> : null}
                        </select>
                      </label>
                      <button disabled={isSavingFarmCollaboration} type="submit">
                        초대 링크 만들기
                      </button>
                    </form>

                    {latestInviteUrl ? (
                      <div className="invite-link stack">
                        <h3>초대 링크가 준비되었습니다</h3>
                        <p className="field-hint">공유·복사하거나 이메일 앱에서 직접 보내세요. 자동 발송은 하지 않습니다.</p>
                        <label>
                          새 초대 링크
                          <input aria-label="새 초대 링크" readOnly value={latestInviteUrl} />
                        </label>
                        <div className="invite-link-actions">
                          <button className="compact" onClick={() => void handleInvitationLinkShare()} type="button">
                            링크 공유
                          </button>
                          <button className="secondary compact" onClick={() => void handleInvitationLinkCopy()} type="button">
                            링크 복사
                          </button>
                          {latestInviteEmailComposeUrl ? (
                            <a className="invite-link-email" href={latestInviteEmailComposeUrl}>
                              이메일 앱에서 보내기
                            </a>
                          ) : null}
                        </div>
                      </div>
                    ) : null}

                    <div className="member-list stack">
                      <h3>현재 구성원</h3>
                      {farmCollaboration.members.length === 0 ? <p className="field-hint">표시할 구성원이 없습니다.</p> : null}
                      {farmCollaboration.members.map((member) => {
                        const isOwner = member.role === "owner";
                        const canChangeRole = farmCollaboration.actorRole === "owner" && !isOwner;
                        const canRemove =
                          !isOwner &&
                          (farmCollaboration.actorRole === "owner" ||
                            (farmCollaboration.actorRole === "admin" && member.role === "farmer"));

                        return (
                          <div className="member-row" key={member.userId}>
                            <div>
                              <strong>{member.email}</strong>
                              <small>{farmRoleLabel(member.role)}</small>
                            </div>
                            {canChangeRole ? (
                              <select
                                aria-label={`${member.email} 역할`}
                                defaultValue={member.role}
                                disabled={isSavingFarmCollaboration}
                                onChange={(event) =>
                                  void handleFarmMemberRoleChange(
                                    member.userId,
                                    event.target.value as Exclude<FarmRole, "owner">,
                                  )
                                }
                              >
                                <option value="farmer">작업자</option>
                                <option value="admin">관리자</option>
                              </select>
                            ) : null}
                            {canRemove ? (
                              <button
                                className="danger compact"
                                disabled={isSavingFarmCollaboration}
                                onClick={() => void handleFarmMemberRemove(member)}
                                type="button"
                              >
                                제거
                              </button>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>

                    <div className="member-list stack">
                      <h3>보낸 초대</h3>
                      {farmCollaboration.invitations.length === 0 ? <p className="field-hint">대기 중인 초대가 없습니다.</p> : null}
                      {farmCollaboration.invitations.map((invitation) => {
                        const canRegenerate = canRegenerateFarmInvitation(farmCollaboration.actorRole, invitation.role);

                        return (
                          <div className="member-row" key={invitation.id}>
                            <div>
                              <strong>{invitation.email}</strong>
                              <small>
                                {farmRoleLabel(invitation.role)} · {displayDate(invitation.expiresAt)} 만료
                              </small>
                            </div>
                            {canRegenerate ? (
                              <button
                                className="secondary compact"
                                disabled={isSavingFarmCollaboration}
                                onClick={() => void handleFarmInvitationRegenerate(invitation)}
                                type="button"
                              >
                                새 링크 만들기
                              </button>
                            ) : null}
                            <button
                              className="danger compact"
                              disabled={isSavingFarmCollaboration}
                              onClick={() => void handleFarmInvitationRevoke(invitation)}
                              type="button"
                            >
                              초대 취소
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </>
            ) : null}
            {farmCollaborationFeedback ? <p className="inline-status" role="status">{farmCollaborationFeedback}</p> : null}
          </details>
          </>
        ) : null}
      </section> : null}

      {userEmail && farm && activeAppSection === "farm" ? (
        <details className="farm-settings-disclosure farm-area-settings">
          <summary>재배 구역 관리 (선택)</summary>
          <p className="field-hint">동·하우스처럼 작업을 나눠 볼 재배 구역이 있을 때만 설정하세요.</p>
          <FarmAreaPanel
            canManageFarm={canManageSelectedFarm}
            farmId={farm.id}
            key={farm.id}
            onAreasChanged={() => void loadFarmAreas(farm.id)}
          />
        </details>
      ) : null}

      {userEmail && farm && canManageSelectedFarm && activeAppSection === "farm" ? (
        <details className="farm-settings-disclosure weather-settings">
          <summary>농장 날씨 위치 설정 (선택)</summary>
          <p className="field-hint">오늘 날씨를 보려면 한 번만 설정하면 됩니다.</p>
          <WeatherLocationPanel farmId={farm.id} onSaved={() => setWeatherRefreshVersion((value) => value + 1)} />
        </details>
      ) : null}

      {userEmail && farm && canManageSelectedFarm && activeAppSection === "farm" ? (
        <details className="farm-settings-disclosure crop-cycle-settings" open={!cropCycle}>
          <summary>재배 작물과 작기 설정</summary>
          <section className="card stack" aria-labelledby="cycle-heading">
            <h2 id="cycle-heading">{cropCycle ? "새 작기 추가" : "재배 작물 입력"}</h2>
            <p className="muted">현재 농장: {farm.name}</p>
            <details className="crop-cycle-create" open={!cropCycle}>
              <summary>{cropCycle ? "새 작기 만들기" : "작기 기본정보 입력"}</summary>
              {cropCycle ? <p className="field-hint">현재 선택한 작기와 별도로 새 작기를 등록합니다.</p> : null}
            <form className="stack" onSubmit={handleCropCycleCreate}>
            <label>
              재배 작물
              <input name="cropCode" required defaultValue="strawberry" placeholder="예: strawberry" />
            </label>
            <label>
              품종 (선택)
              <input name="cultivar" defaultValue="seolhyang" />
            </label>
            <label>
              주 재배 구역 (선택)
              <select defaultValue="" name="farmAreaId">
                <option value="">아직 지정하지 않음</option>
                {farmAreas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
            </label>
            <p className="field-hint">주 재배 구역을 정하면 이후 새로 만드는 기본 작업에 같은 구역이 연결됩니다.</p>
            <label>
              정식일
              <input name="transplantDate" required type="date" defaultValue={transplantDate} />
            </label>
          <label>
            생육 단계 (선택 사항)
            <input name="growthStage" placeholder="예: 개화기" />
          </label>
          <p className="field-hint">
            현재는 직접 입력하거나 비워 둘 수 있습니다. 생육 단계별 선택 목록은 Crop Pack 데이터가 준비된 뒤 제공합니다.
          </p>
            <button disabled={isSubmitting} type="submit">
              재배 작물 등록
            </button>
            </form>
            </details>
          </section>
        </details>
      ) : null}

      {userEmail && cropCycle && farm && activeAppSection === "record" ? (
        <section className="card record-page stack" aria-labelledby="plan-heading">
          <h1 id="plan-heading">오늘 기록하기</h1>
          <p className="muted">
            오늘 해야 할 일을 확인하고, 완료 또는 현장 관찰을 짧게 남기세요.
          </p>
          {canManageSelectedFarm && cropCycle.status === "active" && schedule.length === 0 ? (
            <div className="record-next-action">
              <div>
                <strong>오늘 할 일을 아직 만들지 않았습니다.</strong>
                <p>개발·검증용 기본 작업을 만들어 첫 작업 계획을 시작하세요.</p>
              </div>
              <button disabled={isSubmitting} onClick={handlePlanGeneration} type="button">
                {isSubmitting ? "만드는 중..." : "초기 작업 만들기"}
              </button>
            </div>
          ) : null}
          {!canManageSelectedFarm ? (
            <p className="field-hint">작업자는 일정과 오늘 작업을 확인하고 결과 또는 관찰한 문제를 기록합니다. 작기·생육 단계·계획 변경은 소유자 또는 관리자가 처리합니다.</p>
          ) : null}
          <details className="record-plan-management">
            <summary>일정과 작기 관리</summary>
            <p className="field-hint">작기 상태, 생육 단계, 전체 일정과 새 작업 추가는 필요할 때만 여세요.</p>
          <section className="crop-cycle-lifecycle-entry stack" aria-labelledby="crop-cycle-status-heading">
            <h3 id="crop-cycle-status-heading">작기 상태</h3>
            {cropCycle.status === "active" ? (
              <>
                <p className="field-hint">
                  작기가 끝났다면 완료 처리하세요. 중단했다면 취소 처리할 수 있습니다. 두 상태 모두 기존 일정과 이력은 유지됩니다.
                </p>
                {canManageSelectedFarm ? <div className="button-row">
                  <button disabled={isEndingCropCycle} onClick={() => void handleCropCycleEnd("completed")} type="button">
                    작기 완료
                  </button>
                  <button className="danger" disabled={isEndingCropCycle} onClick={() => void handleCropCycleEnd("cancelled")} type="button">
                    작기 취소
                  </button>
                </div> : null}
              </>
            ) : (
              <p className="field-hint">
                이 작기는 {cropCycleStatusLabel(cropCycle.status)} 상태입니다.
                {cropCycle.endedAt ? ` 종료 시각: ${displayDate(cropCycle.endedAt)}.` : ""} 기존 기록은 조회할 수 있지만 새 작업 계획은 생성할 수 없습니다.
              </p>
            )}
          </section>
          <section className="growth-stage-entry stack" aria-labelledby="growth-stage-heading">
            <h3 id="growth-stage-heading">현재 생육 단계</h3>
            <p className="field-hint">
              Crop Pack의 단계 용어와 주 재배 구역을 저장합니다. 이미 생성된 FarmTask 일정은 자동으로 바뀌지 않습니다.
            </p>
            {canManageSelectedFarm ? <form className="stack" key={cropCycle.id} onSubmit={handleGrowthStageUpdate}>
              <label>
                생육 단계 (선택 사항)
                <input
                  disabled={isUpdatingGrowthStage}
                  maxLength={100}
                  onChange={(event) => setGrowthStageDraft(event.target.value)}
                  placeholder="예: flowering"
                  value={growthStageDraft}
                />
              </label>
              <label>
                주 재배 구역 (선택)
                <select defaultValue={cropCycle.farmAreaId ?? ""} name="farmAreaId">
                  <option value="">아직 지정하지 않음</option>
                  {farmAreas.map((area) => (
                    <option key={area.id} value={area.id}>{area.name}</option>
                  ))}
                </select>
              </label>
              <div className="button-row">
                <button disabled={isUpdatingGrowthStage} type="submit">
                  {isUpdatingGrowthStage ? "저장 중..." : "생육 단계 저장"}
                </button>
              </div>
            </form> : null}
          </section>
          <div className="button-row">
            {canManageSelectedFarm ? <button disabled={isSubmitting || cropCycle.status !== "active"} onClick={handlePlanGeneration} type="button">
              기본 작업 계획 만들기
            </button> : null}
            <button className="secondary" disabled={isSubmitting} onClick={handleRefresh} type="button">
              일정과 기록 새로고침
            </button>
          </div>

          {canManageSelectedFarm && cropCycle.status === "active" ? (
            <details className="manual-task-create" open={schedule.length === 0}>
              <summary>직접 작업 추가</summary>
              <p className="field-hint">
                현장에서 필요한 작업을 이 작기의 일정에 추가합니다. Crop Pack 처방이 아니며 검증 상태는 draft로 표시됩니다.
              </p>
              <form className="stack" onSubmit={handleManualTaskCreate}>
                <label>
                  작업명
                  <input maxLength={200} name="title" required />
                </label>
                <label>
                  작업 이유 또는 현장 메모
                  <textarea maxLength={1000} name="reason" required rows={3} />
                </label>
                <label>
                  작업 대상 재배 구역 (선택)
                  <select defaultValue={cropCycle.farmAreaId ?? ""} name="farmAreaId">
                    <option value="">아직 지정하지 않음</option>
                    {farmAreas.map((area) => (
                      <option key={area.id} value={area.id}>{area.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  예정일
                  <input defaultValue={transplantDate} name="scheduledFor" required type="date" />
                </label>
                <label>
                  우선순위
                  <select defaultValue="medium" name="priority">
                    <option value="high">높음</option>
                    <option value="medium">보통</option>
                    <option value="low">낮음</option>
                  </select>
                </label>
                <button disabled={isSubmitting} type="submit">
                  {isSubmitting ? "작업 추가 중..." : "직접 작업 일정에 추가"}
                </button>
              </form>
            </details>
          ) : null}

          <div className="stack" aria-live="polite">
            <h3 id="schedule-heading">작기 전체 일정</h3>
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
                    <small>담당 {taskAssigneeLabel(task.assignedUserId)}</small>
                    {task.farmAreaId ? <small>재배 구역 {farmAreas.find((area) => area.id === task.farmAreaId)?.name ?? "선택한 구역"}</small> : null}
                    {task.sourceType === "manual" ? <small>직접 등록 작업</small> : null}
                    {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                    <button
                      className="compact secondary"
                      disabled={loadingTaskDetailId !== null}
                      onClick={() => void loadTaskDetail(task.id)}
                      type="button"
                    >
                      {loadingTaskDetailId === task.id ? "상세 불러오는 중..." : "작업 상세"}
                    </button>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="muted">아직 생성된 작업이 없습니다.</p>
            )}
          </div>
          </details>

          <div className="stack today-task-recording" aria-live="polite">
            <h3 id="today-heading">오늘 할 일</h3>
            {todayTasks.length > 0 ? (
              <ol className="task-list">
                {todayTasks.map((task) => (
                  <li key={task.id}>
                    <strong>{task.title}</strong>
                    <span className={task.scheduleState === "overdue" ? "overdue" : "today"}>
                      {task.scheduleState === "overdue" ? "지연 작업" : "오늘 작업"}
                    </span>
                    <small>{task.reason}</small>
                    <small>작업 상태 {taskStatusLabel(task.status)}</small>
                    <small>담당 {taskAssigneeLabel(task.assignedUserId)}</small>
                    <small>검증 상태 {task.verificationStatus}</small>
                    {task.farmAreaId ? <small>재배 구역 {farmAreas.find((area) => area.id === task.farmAreaId)?.name ?? "선택한 구역"}</small> : null}
                    {task.sourceType === "issue_followup" ? <small>문제 재확인 후속 작업</small> : null}
                    <button
                      className="compact secondary"
                      disabled={loadingTaskDetailId !== null}
                      onClick={() => void loadTaskDetail(task.id)}
                      type="button"
                    >
                      {loadingTaskDetailId === task.id ? "상세 불러오는 중..." : "작업 상세"}
                    </button>
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
                        {task.status === "pending" ? (
                          <button
                            className="secondary"
                            disabled={isSubmitting}
                            onClick={() => handleTaskResult(task, "started")}
                            type="button"
                          >
                            {recordingTaskId === task.id ? "기록 중..." : "작업 시작"}
                          </button>
                        ) : null}
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

          {taskDetail ? (
            <section className="task-detail stack" aria-labelledby="task-detail-heading">
              <div className="task-detail-heading">
                <div>
                  <h3 id="task-detail-heading">작업 상세</h3>
                  <p className="field-hint">선택한 작업의 계획 근거와 실행 정보를 확인합니다.</p>
                </div>
                <button className="compact secondary" onClick={() => setTaskDetail(null)} type="button">
                  닫기
                </button>
              </div>
              <strong>{taskDetail.title}</strong>
              <dl className="task-detail-list">
                <div>
                  <dt>작업 이유</dt>
                  <dd>{taskDetail.reason}</dd>
                </div>
                <div>
                  <dt>예정 시각</dt>
                  <dd>{displayDate(taskDetail.scheduledFor)}</dd>
                </div>
                <div>
                  <dt>기한</dt>
                  <dd>{taskDetail.dueAt ? displayDate(taskDetail.dueAt) : "별도 기한 없음"}</dd>
                </div>
                <div>
                  <dt>우선순위 · 상태</dt>
                  <dd>{taskDetail.priority} · {taskStatusLabel(taskDetail.status)}</dd>
                </div>
                <div>
                  <dt>담당자</dt>
                  <dd>{taskAssigneeLabel(taskDetail.assignedUserId)}</dd>
                </div>
                <div>
                  <dt>재배 구역</dt>
                  <dd>{taskDetail.farmAreaId ? farmAreas.find((area) => area.id === taskDetail.farmAreaId)?.name ?? "선택한 구역" : "미지정"}</dd>
                </div>
                <div>
                  <dt>작업 출처 · 결과 기록</dt>
                  <dd>{taskSourceLabel(taskDetail.sourceType)} · {taskDetail.resultRequired ? "필요" : "선택"}</dd>
                </div>
                <div>
                  <dt>검증 상태</dt>
                  <dd>{taskDetail.verificationStatus}</dd>
                </div>
              </dl>
              <div className="task-detail-evidence">
                <strong>근거</strong>
                {taskDetail.evidence.length > 0 ? (
                  <ul>
                    {taskDetail.evidence.map((evidence, index) => (
                      <li key={`${taskDetail.id}-evidence-${index}`}>{evidenceLabel(evidence)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="field-hint">등록된 근거가 없습니다.</p>
                )}
              </div>
              {taskDetail.verificationStatus === "draft" ? (
                <p className="field-hint">이 작업은 개발·검증용 Draft 데이터이며 실제 농업 처방이 아닙니다.</p>
              ) : null}
              {canManageSelectedFarm && (taskDetail.status === "pending" || taskDetail.status === "in_progress") ? (
                <form
                  className="stack"
                  key={`${taskDetail.id}:${taskDetail.assignedUserId ?? "unassigned"}`}
                  onSubmit={handleTaskAssigneeUpdate}
                >
                  <label>
                    담당자 배정
                    <select defaultValue={taskDetail.assignedUserId ?? ""} name="assignedUserId">
                      <option value="">미배정</option>
                      {(farmCollaboration?.members ?? []).map((member) => (
                        <option key={member.userId} value={member.userId}>
                          {member.email} · {farmRoleLabel(member.role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <p className="field-hint">담당자 표시는 작업을 나누기 위한 용도이며, 다른 구성원의 작업 기록을 막지 않습니다.</p>
                  <div className="button-row">
                    <button disabled={isSubmitting || farmCollaboration === null} type="submit">
                      {updatingTaskAssigneeId === taskDetail.id ? "저장 중..." : "담당자 저장"}
                    </button>
                  </div>
                </form>
              ) : null}
              {canManageSelectedFarm && taskDetail.status === "pending" ? (
                <div className="button-row">
                  <button
                    className="danger"
                    disabled={isSubmitting}
                    onClick={() => void handleTaskCancellation(taskDetail)}
                    type="button"
                  >
                    {cancellingTaskId === taskDetail.id ? "취소 중..." : "이 예정 작업 취소"}
                  </button>
                </div>
              ) : null}
            </section>
          ) : null}

          {canManageSelectedFarm && selectedIssue ? (
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

          {attachmentTarget ? (
            <section className="attachment-entry stack" aria-labelledby="attachment-heading">
              <h3 id="attachment-heading">사진 첨부 (선택)</h3>
              <p className="muted">
                {attachmentTarget.taskTitle}의 {attachmentTarget.kind === "issue" ? "문제 기록" : "결과 기록"}에 사진을
                추가합니다. JPEG, PNG, WebP 파일을 10MB까지 올릴 수 있습니다.
              </p>
              <p className="field-hint">사진 업로드에 실패해도 기존 결과·문제 기록은 유지됩니다.</p>
              <form className="stack" onSubmit={handleAttachmentUpload}>
                <label>
                  사진 파일
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    disabled={isUploadingAttachment}
                    onChange={(event) => setAttachmentFile(event.target.files?.[0] ?? null)}
                    ref={attachmentInputRef}
                    required
                    type="file"
                  />
                </label>
                <div className="action-buttons">
                  <button disabled={!attachmentFile || isUploadingAttachment} type="submit">
                    {isUploadingAttachment ? "사진 업로드 중..." : "사진 첨부"}
                  </button>
                  <button
                    className="secondary"
                    disabled={isUploadingAttachment}
                    onClick={() => {
                      setAttachmentFile(null);
                      setAttachmentTarget(null);
                    }}
                    type="button"
                  >
                    닫기
                  </button>
                </div>
              </form>
            </section>
          ) : null}

          <details className="record-history" aria-live="polite">
            <summary id="history-heading">지난 기록 보기</summary>
            <p className="field-hint">이전 작업 결과와 문제 기록은 필요할 때만 확인하세요.</p>
            {history.length > 0 ? (
              <ol className="history-list">
                {history.map((item) => (
                  <li key={item.id}>
                    <span>{displayDate(item.occurredAt)}</span>
                    {item.kind === "action_log" ? (
                      <>
                        <strong>{item.taskTitle}</strong>
                        <small>
                          실행 기록: {actionTypeLabel(item.actionType)}
                          {item.note ? ` · ${item.note}` : ""}
                        </small>
                        {item.attachments.length > 0 ? <AttachmentList attachments={item.attachments} /> : null}
                      </>
                    ) : null}
                    {item.kind === "issue" ? (
                      <>
                        <strong>{item.origin === "observation" ? "관찰 기록 · 확인이 필요한 문제" : `${item.taskTitle} · 문제 기록`}</strong>
                        <small>
                          관찰: {item.observedSymptom} · 심각도 {issueSeverityLabel(item.severity)} · 상태 {issueStatusLabel(item.status)}
                        </small>
                        {item.expertReviewRequired ? <small>전문가 확인 필요</small> : null}
                        {item.attachments.length > 0 ? <AttachmentList attachments={item.attachments} /> : null}
                        {canManageSelectedFarm ? <div className="issue-status-entry">
                          <label>
                            문제 상태
                            <select
                              aria-label={`${item.taskTitle} 문제 상태`}
                              disabled={updatingIssueId === item.issueId}
                              onChange={(event) =>
                                setIssueStatusDrafts((drafts) => ({
                                  ...drafts,
                                  [item.issueId]: event.target.value as IssueStatus,
                                }))
                              }
                              value={issueStatusDraftFor(item.issueId, item.status)}
                            >
                              <option value="open">열림</option>
                              <option value="needs_review">검토 필요</option>
                              <option value="resolved">해결됨</option>
                              <option value="closed_without_action">조치 없이 종료</option>
                            </select>
                          </label>
                          <button
                            className="secondary compact"
                            disabled={
                              updatingIssueId === item.issueId || issueStatusDraftFor(item.issueId, item.status) === item.status
                            }
                            onClick={() =>
                              handleIssueStatusUpdate({
                                id: item.issueId,
                                status: item.status,
                                taskTitle: item.taskTitle,
                              })
                            }
                            type="button"
                          >
                            {updatingIssueId === item.issueId ? "저장 중..." : "상태 저장"}
                          </button>
                          <small className="field-hint">
                            해결됨으로 바꾸면 해결 시각을 기록합니다. 다른 상태로 되돌리면 해결 시각은 비워집니다.
                          </small>
                        </div> : null}
                        {canManageSelectedFarm && item.cropCycleId && (item.status === "open" || item.status === "needs_review") ? (
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
                        {canManageSelectedFarm && item.origin === "observation" && !item.cropCycleId && (item.status === "open" || item.status === "needs_review") ? (
                          <small className="field-hint">이 관찰에는 작기 정보가 없어 재확인 작업을 만들 수 없습니다.</small>
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
          </details>
        </section>
      ) : null}

      {userEmail && farm && activeAppSection === "record" ? (
        <details className="card record-secondary-entry stack">
          <summary>새 관찰 기록 남기기</summary>
          <p className="field-hint">오늘 작업과 별도로 현장에서 본 사실을 남길 때만 여세요.</p>
          <ObservationPanel
            cropCycles={cropCycles}
            farmId={farm.id}
            selectedCropCycleId={cropCycle?.id ?? null}
          />
        </details>
      ) : null}

      {userEmail && farm && activeAppSection === "record" ? (
        <details
          className="card optional-measurement-entry stack"
          onToggle={(event) => setIsMeasurementExpanded(event.currentTarget.open)}
        >
          <summary>수치 기록은 필요할 때만 열기</summary>
          <p className="field-hint">온도계·습도계처럼 직접 확인한 수치가 있을 때만 남기세요. 오늘의 기본 작업이나 관찰 기록에 필요한 단계는 아닙니다.</p>
          {isMeasurementExpanded ? (
            <MeasurementPanel
              cropCycles={cropCycles}
              farmId={farm.id}
              selectedCropCycleId={cropCycle?.id ?? null}
            />
          ) : null}
        </details>
      ) : null}

      {userEmail && farm && cropCycle && activeAppSection === "farm" ? (
        <details className="secondary-information stack">
          <summary>일정과 농장 현황 자세히 보기</summary>
          <p className="field-hint">오늘 해야 할 일 외에 전체 일정, 주간 작업, 운영 현황을 확인할 수 있습니다.</p>
          <OperationsDashboard
            cropCycle={cropCycle}
            farm={farm}
            issues={dashboardIssues}
            schedule={schedule}
            todayTasks={todayTasks}
          />
          <MonthlyWorkCalendar onTaskSelect={(taskId) => void handleTaskDetailSelect(taskId)} tasks={schedule} />
          <WeeklyWorkBoard onTaskSelect={(taskId) => void handleTaskDetailSelect(taskId)} tasks={schedule} />
        </details>
      ) : null}

      {hasSelectedWorkCycle ? <MobileNavigation activeSection={activeAppSection} onNavigate={handleAppNavigation} /> : null}
    </main>
  );
}
