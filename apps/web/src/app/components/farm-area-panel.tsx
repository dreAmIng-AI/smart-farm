"use client";

import type { FormEvent } from "react";
import { useCallback, useEffect, useState } from "react";

type FarmArea = {
  createdAt: string;
  description: string | null;
  id: string;
  name: string;
  updatedAt: string;
};

type FarmAreaPanelProps = {
  canManageFarm: boolean;
  farmId: string;
  onAreasChanged?: () => void;
};

async function fetchFarmAreas(farmId: string) {
  const response = await fetch(`/api/farms/${farmId}/areas`);
  if (!response.ok) {
    throw new Error("Farm area request failed");
  }
  return response.json() as Promise<{ items: FarmArea[] }>;
}

export function FarmAreaPanel({ canManageFarm, farmId, onAreasChanged }: FarmAreaPanelProps) {
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [editingAreaId, setEditingAreaId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const loadAreas = useCallback(() => fetchFarmAreas(farmId), [farmId]);

  useEffect(() => {
    let active = true;
    void loadAreas()
      .then((result) => {
        if (active) {
          setAreas(result.items);
        }
      })
      .catch(() => {
        if (active) {
          setFeedback("재배 구역을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
  }, [loadAreas]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/farms/${farmId}/areas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });
      if (!response.ok) {
        throw new Error("Farm area create failed");
      }

      const area = (await response.json()) as FarmArea;
      setAreas((current) => [...current, area].sort((left, right) => left.name.localeCompare(right.name, "ko")));
      onAreasChanged?.();
      form.reset();
      setFeedback(`${area.name} 재배 구역을 저장했습니다.`);
    } catch {
      setFeedback("재배 구역을 저장하지 못했습니다. 이름을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>, area: FarmArea) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/farm-areas/${area.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          description: formData.get("description"),
        }),
      });
      const result = (await response.json().catch(() => null)) as FarmArea | { error?: { message?: string } } | null;
      if (!response.ok || !result || !("id" in result)) {
        throw new Error(result && "error" in result ? result.error?.message : "Farm area update failed");
      }

      setAreas((current) =>
        current
          .map((currentArea) => (currentArea.id === result.id ? result : currentArea))
          .sort((left, right) => left.name.localeCompare(right.name, "ko")),
      );
      onAreasChanged?.();
      setEditingAreaId(null);
      setFeedback(`${result.name} 재배 구역을 수정했습니다.`);
    } catch {
      setFeedback("재배 구역을 수정하지 못했습니다. 이름을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(area: FarmArea) {
    if (!window.confirm(`${area.name} 재배 구역을 삭제할까요? 연결된 작기·작업·기록이 있으면 삭제되지 않습니다.`)) {
      return;
    }

    setFeedback(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/farm-areas/${area.id}`, { method: "DELETE" });
      if (response.status === 409) {
        setFeedback("이 재배 구역은 작기·작업·관찰 또는 측정 기록과 연결되어 삭제할 수 없습니다.");
        return;
      }
      if (!response.ok) {
        throw new Error("Farm area delete failed");
      }

      setAreas((current) => current.filter((currentArea) => currentArea.id !== area.id));
      onAreasChanged?.();
      setEditingAreaId(null);
      setFeedback(`${area.name} 재배 구역을 삭제했습니다.`);
    } catch {
      setFeedback("재배 구역을 삭제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card farm-area-panel stack" aria-labelledby="farm-area-heading">
      <div>
        <p className="eyebrow">농장 구성</p>
        <h2 id="farm-area-heading">재배 구역</h2>
        <p className="muted">건물·동·포장처럼 현장에서 구분하는 이름을 간단히 등록합니다. 지도나 상세 주소는 입력하지 않습니다.</p>
      </div>

      {canManageFarm ? (
        <form className="stack farm-area-form" onSubmit={handleCreate}>
          <label>
            재배 구역 이름
            <input disabled={isSaving} maxLength={100} name="name" placeholder="예: 1동" required />
          </label>
          <label>
            메모 (선택)
            <input disabled={isSaving} maxLength={1000} name="description" placeholder="예: 시설 재배 구역" />
          </label>
          <button disabled={isSaving} type="submit">
            {isSaving ? "저장 중..." : "재배 구역 추가"}
          </button>
        </form>
      ) : (
        <p className="field-hint">작업자는 등록된 재배 구역을 확인할 수 있습니다. 추가·수정은 농장 소유자 또는 관리자가 합니다.</p>
      )}

      <div className="farm-area-list stack" aria-live="polite">
        <h3>등록된 재배 구역</h3>
        {isLoading ? <p className="field-hint">재배 구역을 불러오는 중입니다.</p> : null}
        {!isLoading && areas.length === 0 ? <p className="field-hint">아직 등록된 재배 구역이 없습니다.</p> : null}
        {!isLoading && areas.length > 0 ? (
          <ul>
            {areas.map((area) => (
              <li key={area.id}>
                {editingAreaId === area.id ? (
                  <form className="farm-area-edit-form" onSubmit={(event) => void handleEdit(event, area)}>
                    <label>
                      재배 구역 이름
                      <input defaultValue={area.name} disabled={isSaving} maxLength={100} name="name" required />
                    </label>
                    <label>
                      메모 (선택)
                      <input defaultValue={area.description ?? ""} disabled={isSaving} maxLength={1000} name="description" />
                    </label>
                    <div className="farm-area-actions">
                      <button disabled={isSaving} type="submit">{isSaving ? "저장 중..." : "수정 저장"}</button>
                      <button disabled={isSaving} onClick={() => setEditingAreaId(null)} type="button">취소</button>
                    </div>
                  </form>
                ) : (
                  <>
                    <strong>{area.name}</strong>
                    {area.description ? <span>{area.description}</span> : null}
                    {canManageFarm ? (
                      <div className="farm-area-actions">
                        <button disabled={isSaving} onClick={() => setEditingAreaId(area.id)} type="button">수정</button>
                        <button className="danger-button" disabled={isSaving} onClick={() => void handleDelete(area)} type="button">삭제</button>
                      </div>
                    ) : null}
                  </>
                )}
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
