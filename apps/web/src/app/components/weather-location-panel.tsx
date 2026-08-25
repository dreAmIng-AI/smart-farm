"use client";

import type { FormEvent } from "react";
import { useState } from "react";

import { toKmaForecastGrid, type KmaForecastGrid } from "@/lib/integrations/kma-grid";

type WeatherLocationPanelProps = {
  farmId: string;
  onSaved: () => void;
};

type WeatherLocationResponse = {
  weatherLocation: {
    gridX: number;
    gridY: number;
    label: string;
    updatedAt: string;
  };
};

export function WeatherLocationPanel({ farmId, onSaved }: WeatherLocationPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [grid, setGrid] = useState<KmaForecastGrid | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [savedLabel, setSavedLabel] = useState<string | null>(null);

  function handleUseDeviceLocation() {
    setFeedback(null);
    if (!navigator.geolocation) {
      setFeedback("이 기기에서는 위치 확인을 지원하지 않습니다. 농장에 있는 휴대전화나 태블릿에서 다시 시도해 주세요.");
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextGrid = toKmaForecastGrid(position.coords.latitude, position.coords.longitude);
        if (!nextGrid) {
          setFeedback("이 위치는 기상청 동네예보 범위에서 확인하지 못했습니다. 농장에 있는 기기에서 다시 시도해 주세요.");
        } else {
          setGrid(nextGrid);
          setFeedback("예보 위치를 확인했습니다. 위치 이름을 입력한 뒤 저장해 주세요.");
        }
        setIsLocating(false);
      },
      () => {
        setFeedback("기기 위치를 가져오지 못했습니다. 위치 권한을 허용한 뒤 농장에 있는 기기에서 다시 시도해 주세요.");
        setIsLocating(false);
      },
      { enableHighAccuracy: false, maximumAge: 300_000, timeout: 10_000 },
    );
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const label = new FormData(event.currentTarget).get("label");
    if (!grid) {
      setFeedback("먼저 ‘이 기기의 위치로 예보 위치 확인’을 눌러 주세요.");
      return;
    }

    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/weather-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label, gridX: grid.x, gridY: grid.y }),
      });
      if (!response.ok) throw new Error("Weather location save failed");

      const result = await response.json() as WeatherLocationResponse;
      setSavedLabel(result.weatherLocation.label);
      onSaved();
      setFeedback("예보 위치를 저장했습니다. 오늘 날씨 카드에서 공식 정보를 불러옵니다.");
    } catch {
      setFeedback("예보 위치를 저장하지 못했습니다. 위치 이름을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card weather-location-panel stack" aria-labelledby="weather-location-heading">
      <div>
        <p className="eyebrow">공식 참고정보</p>
        <h2 id="weather-location-heading">농장 날씨 위치</h2>
        <p className="muted">농장에 있는 기기에서 예보 위치를 한 번 확인하면 오늘 날씨를 볼 수 있습니다.</p>
      </div>
      <form className="weather-location-form stack" onSubmit={handleSave}>
        <label>
          알아보기 쉬운 위치 이름
          <input defaultValue={savedLabel ?? ""} maxLength={100} name="label" placeholder="예: A농장 · 김제시 백구면" required />
        </label>
        <button disabled={isLocating || isSaving} onClick={handleUseDeviceLocation} type="button">
          {isLocating ? "위치 확인 중..." : "이 기기의 위치로 예보 위치 확인"}
        </button>
        <p className="field-hint">기기의 GPS 좌표나 상세 주소는 저장하거나 서버로 보내지 않습니다. 약 5km 단위의 기상청 예보 격자만 농장에 저장합니다.</p>
        <button disabled={!grid || isSaving} type="submit">
          {isSaving ? "저장 중..." : "농장 날씨 위치 저장"}
        </button>
      </form>
      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
