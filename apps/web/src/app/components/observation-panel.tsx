"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type FarmArea = {
  id: string;
  name: string;
};

type CropCycleOption = {
  cropCode: string;
  cultivar: string | null;
  id: string;
};

type ObservationIssueStatus = "open" | "needs_review" | "resolved" | "closed_without_action";

type Observation = {
  content: string;
  createdAt: string;
  cropCycleId: string | null;
  farmAreaId: string | null;
  id: string;
  issue: {
    id: string;
    status: ObservationIssueStatus;
  } | null;
  observedAt: string;
};

type ObservationPanelProps = {
  cropCycles: CropCycleOption[];
  farmId: string;
  selectedCropCycleId: string | null;
};

type ObservationIssueDraft = {
  expertReviewRequired: boolean;
  severity: "low" | "medium" | "high" | "unknown";
};

function cropCycleLabel(cropCycle: CropCycleOption) {
  return cropCycle.cultivar ? `${cropCycle.cropCode} · ${cropCycle.cultivar}` : cropCycle.cropCode;
}

function displayObservedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function fetchObservationData(farmId: string) {
  const [observationResponse, areaResponse] = await Promise.all([
    fetch(`/api/farms/${farmId}/observations`),
    fetch(`/api/farms/${farmId}/areas`),
  ]);
  if (!observationResponse.ok || !areaResponse.ok) {
    throw new Error("Observation request failed");
  }

  const [observationData, areaData] = await Promise.all([
    observationResponse.json() as Promise<{ items: Observation[] }>,
    areaResponse.json() as Promise<{ items: FarmArea[] }>,
  ]);
  return { observations: observationData.items, areas: areaData.items };
}

export function ObservationPanel({ cropCycles, farmId, selectedCropCycleId }: ObservationPanelProps) {
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [farmAreaId, setFarmAreaId] = useState("");
  const [cropCycleId, setCropCycleId] = useState(selectedCropCycleId ?? "");
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [creatingIssueId, setCreatingIssueId] = useState<string | null>(null);
  const [issueDrafts, setIssueDrafts] = useState<Record<string, ObservationIssueDraft>>({});
  const loadObservationData = useCallback(() => fetchObservationData(farmId), [farmId]);
  const areaNameById = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);
  const cropCycleLabelById = useMemo(
    () => new Map(cropCycles.map((cropCycle) => [cropCycle.id, cropCycleLabel(cropCycle)])),
    [cropCycles],
  );

  useEffect(() => {
    let active = true;
    void loadObservationData()
      .then((result) => {
        if (active) {
          setObservations(result.observations);
          setAreas(result.areas);
        }
      })
      .catch(() => {
        if (active) {
          setFeedback("관찰 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
        }
      })
      .finally(() => {
        if (active) {
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [loadObservationData]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/observations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: formData.get("content"),
          cropCycleId: cropCycleId || null,
          farmAreaId: farmAreaId || null,
          observedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) {
        throw new Error("Observation create failed");
      }

      const observation = (await response.json()) as Observation;
      setObservations((current) =>
        [observation, ...current].sort(
          (left, right) => new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime(),
        ),
      );
      form.reset();
      setFarmAreaId("");
      setCropCycleId(selectedCropCycleId ?? "");
      setFeedback("관찰 기록을 저장했습니다.");
    } catch {
      setFeedback("관찰 기록을 저장하지 못했습니다. 내용을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  function issueDraftFor(observationId: string): ObservationIssueDraft {
    return issueDrafts[observationId] ?? { severity: "unknown", expertReviewRequired: false };
  }

  async function handleCreateIssue(observation: Observation) {
    const draft = issueDraftFor(observation.id);
    setFeedback(null);
    setCreatingIssueId(observation.id);

    try {
      const response = await fetch(`/api/observations/${observation.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const result = await response.json().catch(() => null) as {
        error?: { code?: string; message?: string };
        issue?: { id: string; status: ObservationIssueStatus };
      } | null;
      if (!response.ok || !result?.issue) {
        if (result?.error?.code === "OBSERVATION_ALREADY_HAS_ISSUE") {
          setFeedback("이 관찰 기록은 이미 확인이 필요한 문제로 기록되어 있습니다. 새로고침하면 상태를 확인할 수 있습니다.");
          return;
        }
        throw new Error(result?.error?.message ?? "Observation issue create failed");
      }

      setObservations((current) =>
        current.map((item) => (item.id === observation.id ? { ...item, issue: result.issue ?? null } : item)),
      );
      setFeedback("관찰 기록을 확인이 필요한 문제로 기록했습니다. 이것은 확정 진단이나 처방이 아닙니다.");
    } catch {
      setFeedback("확인이 필요한 문제로 기록하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setCreatingIssueId(null);
    }
  }

  return (
    <section className="card observation-panel stack" aria-labelledby="observation-heading">
      <div>
        <p className="eyebrow">현장 기록</p>
        <h2 id="observation-heading">관찰 기록</h2>
        <p className="muted">작업과 관계없이 현장에서 본 사실을 바로 남깁니다. 확정 진단이나 처방을 입력하는 곳은 아닙니다.</p>
      </div>

      <form className="stack observation-form" onSubmit={handleCreate}>
        <label>
          현장에서 본 사실
          <textarea disabled={isSaving} maxLength={2000} name="content" placeholder="예: 잎에서 갈색 반점이 보임" required rows={3} />
        </label>
        <div className="observation-context-fields">
          <label>
            재배 구역 (선택)
            <select disabled={isSaving || isLoading} onChange={(event) => setFarmAreaId(event.target.value)} value={farmAreaId}>
              <option value="">선택하지 않음</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
          </label>
          <label>
            현재 작기 (선택)
            <select disabled={isSaving} onChange={(event) => setCropCycleId(event.target.value)} value={cropCycleId}>
              <option value="">선택하지 않음</option>
              {cropCycles.map((cropCycle) => <option key={cropCycle.id} value={cropCycle.id}>{cropCycleLabel(cropCycle)}</option>)}
            </select>
          </label>
        </div>
        <p className="field-hint">저장 시각은 현재 시각으로 기록됩니다. 필요하면 재배 구역과 현재 작기만 함께 선택하세요.</p>
        <button disabled={isSaving || isLoading} type="submit">{isSaving ? "저장 중..." : "관찰 기록 저장"}</button>
      </form>

      <div className="observation-list stack" aria-live="polite">
        <h3>최근 관찰 기록</h3>
        {isLoading ? <p className="field-hint">관찰 기록을 불러오는 중입니다.</p> : null}
        {!isLoading && observations.length === 0 ? <p className="field-hint">아직 남긴 관찰 기록이 없습니다.</p> : null}
        {!isLoading && observations.length > 0 ? (
          <ol>
            {observations.map((observation) => (
              <li key={observation.id}>
                <small>
                  {displayObservedAt(observation.observedAt)}
                  {observation.farmAreaId ? ` · ${areaNameById.get(observation.farmAreaId) ?? "재배 구역"}` : ""}
                  {observation.cropCycleId ? ` · ${cropCycleLabelById.get(observation.cropCycleId) ?? "현재 작기"}` : ""}
                </small>
                <p>{observation.content}</p>
                {observation.issue ? (
                  <small className="observation-issue-badge">확인이 필요한 문제 · {observation.issue.status === "needs_review" ? "검토 필요" : observation.issue.status === "open" ? "열림" : observation.issue.status === "resolved" ? "해결됨" : "조치 없이 종료"}</small>
                ) : (
                  <details className="observation-issue-entry">
                    <summary>확인이 필요한 문제로 기록</summary>
                    <p className="field-hint">관찰한 사실은 그대로 보존합니다. 여기서는 확정 진단이나 처방을 내리지 않습니다.</p>
                    <label>
                      중요도
                      <select
                        disabled={creatingIssueId === observation.id}
                        onChange={(event) => setIssueDrafts((current) => ({
                          ...current,
                          [observation.id]: { ...issueDraftFor(observation.id), severity: event.target.value as ObservationIssueDraft["severity"] },
                        }))}
                        value={issueDraftFor(observation.id).severity}
                      >
                        <option value="unknown">알 수 없음</option>
                        <option value="low">낮음</option>
                        <option value="medium">보통</option>
                        <option value="high">높음</option>
                      </select>
                    </label>
                    <label className="checkbox-label">
                      <input
                        checked={issueDraftFor(observation.id).expertReviewRequired}
                        disabled={creatingIssueId === observation.id}
                        onChange={(event) => setIssueDrafts((current) => ({
                          ...current,
                          [observation.id]: { ...issueDraftFor(observation.id), expertReviewRequired: event.target.checked },
                        }))}
                        type="checkbox"
                      />
                      전문가 확인 필요
                    </label>
                    <button
                      className="issue-button compact"
                      disabled={creatingIssueId === observation.id}
                      onClick={() => void handleCreateIssue(observation)}
                      type="button"
                    >
                      {creatingIssueId === observation.id ? "문제 기록 중..." : "확인이 필요한 문제로 기록"}
                    </button>
                  </details>
                )}
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
