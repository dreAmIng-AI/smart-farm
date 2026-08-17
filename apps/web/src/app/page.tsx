"use client";

import type { FormEvent } from "react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import {
  canRegenerateFarmInvitation,
  copyFarmInvitationLink,
  createFarmInvitationEmailComposeUrl,
  shareFarmInvitationLink,
} from "@/lib/invitation-sharing";
import { removeFarmInvitationToken } from "@/lib/invitation-acceptance";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Farm = {
  id: string;
  name: string;
  regionCode: string;
  cultivationEnvironment: "facility" | "open_field";
  cultivationMethod: string | null;
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
  transplantDate: string;
  growthStage: string | null;
  status: "active" | "completed" | "cancelled";
  endedAt: string | null;
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
  const [farmFeedback, setFarmFeedback] = useState<string | null>(null);
  const [actionNotes, setActionNotes] = useState<Record<string, string>>({});
  const [issueDrafts, setIssueDrafts] = useState<Record<string, IssueDraft>>({});
  const [recordingTaskId, setRecordingTaskId] = useState<string | null>(null);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [isUpdatingFarm, setIsUpdatingFarm] = useState(false);
  const [farmCollaboration, setFarmCollaboration] = useState<FarmCollaboration | null>(null);
  const [isLoadingFarmCollaboration, setIsLoadingFarmCollaboration] = useState(false);
  const [isSavingFarmCollaboration, setIsSavingFarmCollaboration] = useState(false);
  const [farmCollaborationFeedback, setFarmCollaborationFeedback] = useState<string | null>(null);
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null);
  const [latestInviteEmail, setLatestInviteEmail] = useState<string | null>(null);
  const [cropCycles, setCropCycles] = useState<CropCycle[]>([]);
  const [cropCycle, setCropCycle] = useState<CropCycle | null>(null);
  const [growthStageDraft, setGrowthStageDraft] = useState("");
  const [isUpdatingGrowthStage, setIsUpdatingGrowthStage] = useState(false);
  const [isEndingCropCycle, setIsEndingCropCycle] = useState(false);
  const [schedule, setSchedule] = useState<FarmTask[]>([]);
  const [todayTasks, setTodayTasks] = useState<FarmTask[]>([]);
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
  const restoreFarmContextRef = useRef<((selectedFarm: Farm) => Promise<CropCycle[]>) | null>(null);
  const [isCreatingFollowUp, setIsCreatingFollowUp] = useState(false);
  const [isRestoringContext, setIsRestoringContext] = useState(false);
  const [message, setMessage] = useState(
    "Supabase 인증 세션과 .env.local 설정 후 첫 Slice를 실행할 수 있습니다.",
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedFarmId = farm?.id;
  const latestInviteEmailComposeUrl =
    farm && latestInviteEmail && latestInviteUrl
      ? createFarmInvitationEmailComposeUrl({
          farmName: farm.name,
          inviteUrl: latestInviteUrl,
          recipientEmail: latestInviteEmail,
        })
      : null;

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

  useEffect(() => {
    if (!userEmail) {
      return;
    }

    let isMounted = true;

    async function loadFarms() {
      const requestVersion = ++farmListRequestVersion.current;
      try {
        const result = await apiRequest<{ items: Farm[] }>("/api/farms", { method: "GET" });
        if (isMounted && requestVersion === farmListRequestVersion.current) {
          setFarms(result.items);
        }
      } catch (error) {
        if (isMounted) {
          setMessage(error instanceof Error ? error.message : "Farm 목록을 불러오지 못했습니다.");
        }
      }
    }

    void loadFarms();

    return () => {
      isMounted = false;
    };
  }, [userEmail]);

  useEffect(() => {
    restoreFarmContextRef.current = restoreFarmContext;
  });

  useEffect(() => {
    if (!userEmail || invitationAcceptanceAttempted.current) {
      return;
    }

    const token = new URLSearchParams(window.location.search).get("invite");
    if (!token) {
      return;
    }

    invitationAcceptanceAttempted.current = true;

    async function acceptInvitation() {
      let accepted: { farmId: string; role: Exclude<FarmRole, "owner"> };
      try {
        accepted = await apiRequest<{ farmId: string; role: Exclude<FarmRole, "owner"> }>(
          "/api/farm-invitations/accept",
          { method: "POST", body: JSON.stringify({ token }) },
        );
      } catch (error) {
        invitationAcceptanceAttempted.current = false;
        const errorMessage = error instanceof Error ? error.message : "Farm 초대를 수락하지 못했습니다.";
        setMessage(`${errorMessage} 초대받은 이메일로 다시 로그인한 뒤 이 링크를 다시 열어 주세요.`);
        return;
      }

      window.history.replaceState({}, "", removeFarmInvitationToken(window.location.href));

      const requestVersion = ++farmListRequestVersion.current;
      try {
        const farmsResult = await apiRequest<{ items: Farm[] }>("/api/farms", { method: "GET" });
        if (requestVersion !== farmListRequestVersion.current) {
          return;
        }

        setFarms(farmsResult.items);
        const acceptedFarm = farmsResult.items.find((item) => item.id === accepted.farmId);
        if (!acceptedFarm) {
          setMessage(`Farm 초대를 수락했습니다. ${farmRoleLabel(accepted.role)} 역할로 Farm 목록에서 선택해 시작하세요.`);
          return;
        }

        const restoreFarmContext = restoreFarmContextRef.current;
        if (!restoreFarmContext) {
          throw new Error("Farm context could not be restored.");
        }

        const cropCycleItems = await restoreFarmContext(acceptedFarm);
        setMessage(
          `Farm 초대를 수락했습니다. ${farmRoleLabel(accepted.role)} 역할로 ${acceptedFarm.name}을 열었습니다. ${
            cropCycleItems.length > 0 ? "CropCycle을 선택해 일정을 이어서 보세요." : "새 CropCycle을 만들 수 있습니다."
          }`,
        );
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Farm 정보를 불러오지 못했습니다.";
        setMessage(`Farm 초대는 수락했습니다. ${errorMessage} 새로고침한 뒤 Farm을 선택해 주세요.`);
      }
    }

    void acceptInvitation();
  }, [userEmail]);

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
            error instanceof Error ? error.message : "Farm 구성원 정보를 불러오지 못했습니다.",
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
      setFarms([]);
      setFarm(null);
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setCropCycles([]);
      setCropCycle(null);
      setGrowthStageDraft("");
      setSchedule([]);
      setTodayTasks([]);
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
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setFarms((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setCropCycles([]);
      setCropCycle(null);
      setGrowthStageDraft("");
      setSchedule([]);
      setTodayTasks([]);
      setHistory([]);
      setSelectedIssue(null);
      setIssueStatusDrafts({});
      setAttachmentTarget(null);
      setAttachmentFile(null);
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
      setMessage(`Farm “${updated.name}” 기본정보를 저장했습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Farm 기본정보 저장에 실패했습니다.");
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
        error instanceof Error ? error.message : "Farm 초대 링크를 만들지 못했습니다.",
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
          transplantDate: form.get("transplantDate"),
          growthStage: form.get("growthStage"),
        }),
      });
      setCropCycle(created);
      setCropCycles((items) => [created, ...items.filter((item) => item.id !== created.id)]);
      setGrowthStageDraft(created.growthStage ?? "");
      setSchedule([]);
      setTodayTasks([]);
      setHistory([]);
      setSelectedIssue(null);
      setIssueStatusDrafts({});
      setAttachmentTarget(null);
      setAttachmentFile(null);
      setMessage("CropCycle을 만들었습니다. Draft Template을 적용해 계획을 생성하세요.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CropCycle 생성에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGrowthStageUpdate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cropCycle) {
      return;
    }

    setIsUpdatingGrowthStage(true);
    try {
      const updated = await apiRequest<CropCycle>(`/api/crop-cycles/${cropCycle.id}`, {
        method: "PATCH",
        body: JSON.stringify({ growthStage: growthStageDraft }),
      });
      setCropCycle(updated);
      setCropCycles((items) => items.map((item) => (item.id === updated.id ? updated : item)));
      setGrowthStageDraft(updated.growthStage ?? "");
      setMessage(
        updated.growthStage
          ? `현재 생육 단계를 “${updated.growthStage}”로 저장했습니다.`
          : "현재 생육 단계 설정을 비웠습니다.",
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
    if (!window.confirm(`이 CropCycle을 ${statusLabel} 처리할까요? 종료된 작기에는 새 작업 계획을 생성할 수 없습니다.`)) {
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
      setMessage(`CropCycle을 ${statusLabel} 처리했습니다. 기존 일정과 이력은 보존됩니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CropCycle 상태 저장에 실패했습니다.");
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

  function clearCropCycleContext() {
    setCropCycle(null);
    setGrowthStageDraft("");
    setSchedule([]);
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
    try {
      const cropCycleItems = await loadCropCycles(selectedFarm.id);
      await Promise.all([loadTodayTasks(selectedFarm.id), loadHistory(selectedFarm.id)]);
      return cropCycleItems;
    } finally {
      setIsRestoringContext(false);
    }
  }

  async function handleSavedFarmSelect(farmId: string) {
    const selectedFarm = farms.find((item) => item.id === farmId);
    if (!selectedFarm) {
      setFarm(null);
      setFarmCollaboration(null);
      setFarmCollaborationFeedback(null);
      setLatestInviteUrl(null);
      setLatestInviteEmail(null);
      setCropCycles([]);
      clearCropCycleContext();
      setTodayTasks([]);
      setHistory([]);
      return;
    }

    try {
      const cropCycleItems = await restoreFarmContext(selectedFarm);
      setMessage(
        `${selectedFarm.name}을 열었습니다. ${cropCycleItems.length > 0 ? "CropCycle을 선택해 일정을 이어서 보세요." : "새 CropCycle을 만들 수 있습니다."}`,
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장된 Farm 정보를 불러오지 못했습니다.");
    }
  }

  async function handleSavedCropCycleSelect(cropCycleId: string) {
    const selectedCropCycle = cropCycles.find((item) => item.id === cropCycleId);
    if (!selectedCropCycle) {
      clearCropCycleContext();
      return;
    }

    setIsRestoringContext(true);
    setCropCycle(selectedCropCycle);
    setGrowthStageDraft(selectedCropCycle.growthStage ?? "");
    setSchedule([]);
    setSelectedIssue(null);
    setIssueStatusDrafts({});
    setAttachmentTarget(null);
    setAttachmentFile(null);
    try {
      await Promise.all([
        loadSchedule(selectedCropCycle.id),
        farm ? loadTodayTasks(farm.id) : Promise.resolve(),
        farm ? loadHistory(farm.id) : Promise.resolve(),
      ]);
      setMessage(`${selectedCropCycle.cropCode} CropCycle의 기존 일정과 기록을 불러왔습니다.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "저장된 CropCycle 정보를 불러오지 못했습니다.");
    } finally {
      setIsRestoringContext(false);
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
      } else {
        setAttachmentTarget({ id: recorded.actionLog.id, kind: "action_log", taskTitle: task.title });
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

      {userEmail ? (
        <section className="card saved-context stack" aria-labelledby="saved-context-heading">
          <h2 id="saved-context-heading">저장된 Farm·CropCycle 열기</h2>
          <p className="field-hint">
            이전에 만든 Farm과 CropCycle을 선택하면 기존 일정, Today, 이력을 다시 불러옵니다. 작업 계획은 자동으로 다시 생성하지 않습니다.
          </p>
          <label>
            Farm 선택
            <select
              disabled={isRestoringContext}
              onChange={(event) => void handleSavedFarmSelect(event.target.value)}
              value={farm?.id ?? ""}
            >
              <option value="">Farm을 선택하세요</option>
              {farms.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} · {item.regionCode}
                </option>
              ))}
            </select>
          </label>
          {farm ? (
            <label>
              CropCycle 선택
              <select
                disabled={isRestoringContext}
                onChange={(event) => void handleSavedCropCycleSelect(event.target.value)}
                value={cropCycle?.id ?? ""}
              >
                <option value="">CropCycle을 선택하세요</option>
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
        </section>
      ) : null}

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
        {farm ? (
          <>
          <details className="farm-settings" open>
            <summary>현재 Farm 기본정보 수정</summary>
            <p className="field-hint">Farm 기본정보만 변경합니다. 기존 CropCycle, FarmTask, 결과와 이력은 바꾸지 않습니다.</p>
            <form className="stack" key={`${farm.id}:${farm.name}:${farm.regionCode}:${farm.cultivationEnvironment}:${farm.cultivationMethod ?? ""}`} onSubmit={handleFarmUpdate}>
              <label>
                농장명
                <input defaultValue={farm.name} name="name" required />
              </label>
              <label>
                지역 코드
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
                {isUpdatingFarm ? "Farm 저장 중..." : "Farm 기본정보 저장"}
              </button>
            </form>
          </details>
          <details className="farm-collaboration" open>
            <summary>Farm 구성원과 초대 관리</summary>
            <p className="field-hint">
              자동 이메일은 보내지 않습니다. 만든 초대 링크를 복사해 해당 이메일의 팀원에게 직접 전달하세요.
            </p>
            {isLoadingFarmCollaboration ? <small className="field-hint">구성원 정보를 불러오는 중입니다.</small> : null}
            {farmCollaboration ? (
              <>
                <p className="muted">내 역할: {farmRoleLabel(farmCollaboration.actorRole)}</p>
                {farmCollaboration.actorRole === "farmer" ? (
                  <p className="field-hint">작업자는 Farm 운영 데이터를 사용할 수 있지만 구성원과 초대는 관리할 수 없습니다.</p>
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
            {cropCycle.cropCode} / {cropCycle.cultivar ?? "작물 공통"} · 정식일 {cropCycle.transplantDate} · 상태 {cropCycleStatusLabel(cropCycle.status)} · 현재 생육 단계 {cropCycle.growthStage ?? "미설정"}
          </p>
          <section className="crop-cycle-lifecycle-entry stack" aria-labelledby="crop-cycle-status-heading">
            <h3 id="crop-cycle-status-heading">작기 상태</h3>
            {cropCycle.status === "active" ? (
              <>
                <p className="field-hint">
                  작기가 끝났다면 완료 처리하세요. 중단했다면 취소 처리할 수 있습니다. 두 상태 모두 기존 일정과 이력은 유지됩니다.
                </p>
                <div className="button-row">
                  <button disabled={isEndingCropCycle} onClick={() => void handleCropCycleEnd("completed")} type="button">
                    작기 완료
                  </button>
                  <button className="danger" disabled={isEndingCropCycle} onClick={() => void handleCropCycleEnd("cancelled")} type="button">
                    작기 취소
                  </button>
                </div>
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
              Crop Pack의 단계 용어를 직접 입력합니다. 저장해도 기존 FarmTask 일정은 자동으로 바뀌지 않습니다.
            </p>
            <form className="stack" onSubmit={handleGrowthStageUpdate}>
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
              <div className="button-row">
                <button disabled={isUpdatingGrowthStage} type="submit">
                  {isUpdatingGrowthStage ? "저장 중..." : "생육 단계 저장"}
                </button>
              </div>
            </form>
          </section>
          <div className="button-row">
            <button disabled={isSubmitting || cropCycle.status !== "active"} onClick={handlePlanGeneration} type="button">
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
                        {item.attachments.length > 0 ? <AttachmentList attachments={item.attachments} /> : null}
                      </>
                    ) : null}
                    {item.kind === "issue" ? (
                      <>
                        <strong>{item.taskTitle} · 문제 기록</strong>
                        <small>
                          관찰: {item.observedSymptom} · 심각도 {issueSeverityLabel(item.severity)} · 상태 {issueStatusLabel(item.status)}
                        </small>
                        {item.expertReviewRequired ? <small>전문가 확인 필요</small> : null}
                        {item.attachments.length > 0 ? <AttachmentList attachments={item.attachments} /> : null}
                        <div className="issue-status-entry">
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
                        </div>
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
