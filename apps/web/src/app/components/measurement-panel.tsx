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

type Measurement = {
  cropCycleId: string | null;
  farmAreaId: string | null;
  id: string;
  metricCode: string;
  note: string | null;
  observedAt: string;
  unit: string;
  valueNumeric: number;
};

type MeasurementPanelProps = {
  cropCycles: CropCycleOption[];
  farmId: string;
  selectedCropCycleId: string | null;
};

const metricLabels: Record<string, string> = {
  manual_humidity: "습도",
  manual_soil_moisture: "토양 수분",
  manual_temperature: "온도",
  other: "기타 측정",
};

const defaultUnitByMetric: Record<string, string> = {
  manual_humidity: "%",
  manual_soil_moisture: "%",
  manual_temperature: "℃",
  other: "",
};

function displayObservedAt(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function cropCycleLabel(cropCycle: CropCycleOption) {
  return cropCycle.cultivar ? `${cropCycle.cropCode} · ${cropCycle.cultivar}` : cropCycle.cropCode;
}

async function fetchMeasurementData(farmId: string) {
  const [measurementResponse, areaResponse] = await Promise.all([
    fetch(`/api/farms/${farmId}/measurements`),
    fetch(`/api/farms/${farmId}/areas`),
  ]);
  if (!measurementResponse.ok || !areaResponse.ok) {
    throw new Error("Measurement request failed");
  }

  const [measurementData, areaData] = await Promise.all([
    measurementResponse.json() as Promise<{ items: Measurement[] }>,
    areaResponse.json() as Promise<{ items: FarmArea[] }>,
  ]);
  return { areas: areaData.items, measurements: measurementData.items };
}

export function MeasurementPanel({ cropCycles, farmId, selectedCropCycleId }: MeasurementPanelProps) {
  const [areas, setAreas] = useState<FarmArea[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [farmAreaId, setFarmAreaId] = useState("");
  const [cropCycleIdOverride, setCropCycleIdOverride] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [metricCode, setMetricCode] = useState("manual_temperature");
  const [unit, setUnit] = useState(defaultUnitByMetric.manual_temperature);
  const loadMeasurementData = useCallback(() => fetchMeasurementData(farmId), [farmId]);
  const cropCycleId = cropCycleIdOverride ?? selectedCropCycleId ?? "";
  const areaNameById = useMemo(() => new Map(areas.map((area) => [area.id, area.name])), [areas]);
  const cropCycleLabelById = useMemo(
    () => new Map(cropCycles.map((cropCycle) => [cropCycle.id, cropCycleLabel(cropCycle)])),
    [cropCycles],
  );

  useEffect(() => {
    let active = true;
    void loadMeasurementData()
      .then((result) => {
        if (active) {
          setAreas(result.areas);
          setMeasurements(result.measurements);
        }
      })
      .catch(() => {
        if (active) {
          setFeedback("측정 기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
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
  }, [loadMeasurementData]);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/measurements`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metricCode: data.get("metricCode"),
          valueNumeric: Number(data.get("valueNumeric")),
          unit: data.get("unit"),
          note: data.get("note"),
          cropCycleId: cropCycleId || null,
          farmAreaId: farmAreaId || null,
          observedAt: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Measurement create failed");
      const measurement = (await response.json()) as Measurement;
      setMeasurements((current) =>
        [measurement, ...current].sort(
          (left, right) => new Date(right.observedAt).getTime() - new Date(left.observedAt).getTime(),
        ),
      );
      form.reset();
      setFarmAreaId("");
      setCropCycleIdOverride(null);
      setMetricCode("manual_temperature");
      setUnit(defaultUnitByMetric.manual_temperature);
      setFeedback("측정 기록을 저장했습니다.");
    } catch {
      setFeedback("측정 기록을 저장하지 못했습니다. 항목·수치·단위를 확인해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card measurement-panel stack" aria-labelledby="measurement-heading">
      <div>
        <p className="eyebrow">현장 기록</p>
        <h2 id="measurement-heading">측정 기록</h2>
        <p className="muted">직접 측정한 수치만 남깁니다. 자동 센서값이나 농업 처방은 아닙니다.</p>
      </div>
      <form className="measurement-form stack" onSubmit={handleCreate}>
        <div className="measurement-fields">
          <label className="measurement-metric-field">
            측정 항목
            <select
              disabled={isSaving}
              name="metricCode"
              onChange={(event) => {
                const nextMetricCode = event.target.value;
                setMetricCode(nextMetricCode);
                setUnit(defaultUnitByMetric[nextMetricCode] ?? "");
              }}
              value={metricCode}
            >
              <option value="manual_temperature">온도</option>
              <option value="manual_humidity">습도</option>
              <option value="manual_soil_moisture">토양 수분</option>
              <option value="other">기타</option>
            </select>
          </label>
          <label className="measurement-value-field">
            측정 수치
            <input disabled={isSaving} inputMode="decimal" name="valueNumeric" placeholder="예: 24.5" required step="any" type="number" />
          </label>
          <label className="measurement-unit-field">
            단위
            <input
              disabled={isSaving}
              maxLength={50}
              name="unit"
              onChange={(event) => setUnit(event.target.value)}
              placeholder="예: ℃, %, mS/cm"
              required
              value={unit}
            />
          </label>
        </div>
        <div className="measurement-context-fields">
          <label>
            재배 구역 (선택)
            <select disabled={isSaving || isLoading} onChange={(event) => setFarmAreaId(event.target.value)} value={farmAreaId}>
              <option value="">선택하지 않음</option>
              {areas.map((area) => <option key={area.id} value={area.id}>{area.name}</option>)}
            </select>
          </label>
          <label>
            현재 작기 (선택)
            <select disabled={isSaving} onChange={(event) => setCropCycleIdOverride(event.target.value)} value={cropCycleId}>
              <option value="">선택하지 않음</option>
              {cropCycles.map((cropCycle) => <option key={cropCycle.id} value={cropCycle.id}>{cropCycleLabel(cropCycle)}</option>)}
            </select>
          </label>
        </div>
        <label>
          메모 (선택)
          <input disabled={isSaving} maxLength={1000} name="note" placeholder="측정한 위치나 상황" />
        </label>
        <p className="field-hint">저장 시각은 현재 시각으로 기록됩니다. 필요하면 재배 구역과 현재 작기만 함께 선택하세요.</p>
        <button disabled={isSaving || isLoading} type="submit">{isSaving ? "저장 중..." : "측정 기록 저장"}</button>
      </form>
      <div className="measurement-list stack" aria-live="polite">
        <h3>최근 측정 기록</h3>
        {isLoading ? <p className="field-hint">측정 기록을 불러오는 중입니다.</p> : null}
        {!isLoading && measurements.length === 0 ? <p className="field-hint">아직 남긴 측정 기록이 없습니다.</p> : null}
        {!isLoading && measurements.length > 0 ? (
          <ol>
            {measurements.map((measurement) => (
              <li key={measurement.id}>
                <small>
                  {displayObservedAt(measurement.observedAt)}
                  {measurement.farmAreaId ? ` · ${areaNameById.get(measurement.farmAreaId) ?? "재배 구역"}` : ""}
                  {measurement.cropCycleId ? ` · ${cropCycleLabelById.get(measurement.cropCycleId) ?? "현재 작기"}` : ""}
                </small>
                <strong>{metricLabels[measurement.metricCode] ?? measurement.metricCode} · {measurement.valueNumeric} {measurement.unit}</strong>
                {measurement.note ? <span>{measurement.note}</span> : null}
              </li>
            ))}
          </ol>
        ) : null}
      </div>
      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
