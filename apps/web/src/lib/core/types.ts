export const verificationStatuses = [
  "draft",
  "evidence_checked",
  "expert_reviewed",
  "field_validated",
] as const;

export type VerificationStatus = (typeof verificationStatuses)[number];

export type TaskStatus =
  | "pending"
  | "in_progress"
  | "completed"
  | "issue_reported"
  | "cancelled";

export type TaskPriority = "low" | "medium" | "high";

export type IssueStatus = "open" | "needs_review" | "resolved" | "closed_without_action";

export type IssueSeverity = "low" | "medium" | "high" | "unknown";

export type CropCycle = {
  id: string;
  farmId: string;
  cropCode: string;
  cultivar: string | null;
  transplantDate: string;
};

export type TaskTemplate = {
  id: string;
  cropCode: string;
  cultivar: string | null;
  growthStage: string | null;
  taskType: string;
  title: string;
  reason: string;
  timing: { offsetDays?: number };
  priority: TaskPriority;
  evidence: unknown[];
  verificationStatus: VerificationStatus;
};

export type PlannedFarmTask = {
  cropCycleId: string;
  farmId: string;
  taskTemplateId: string;
  title: string;
  taskType: string;
  reason: string;
  priority: TaskPriority;
  scheduledFor: string;
  evidence: unknown[];
  verificationStatus: VerificationStatus;
  sourceType: "template";
  status: "pending";
  resultRequired: true;
};
