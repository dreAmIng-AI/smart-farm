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

type Observation = {
  content: string;
  createdAt: string;
  cropCycleId: string | null;
  farmAreaId: string | null;
  id: string;
  observedAt: string;
};

type ObservationPanelProps = {
  cropCycles: CropCycleOption[];
  farmId: string;
  selectedCropCycleId: string | null;
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
              </li>
            ))}
          </ol>
        ) : null}
      </div>

      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
