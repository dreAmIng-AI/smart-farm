"use client";

import type { FormEvent } from "react";
import { useEffect, useState } from "react";

import { geolocationFailureMessage } from "@/lib/integrations/geolocation-feedback";
import { toKmaForecastGrid, type KmaForecastGrid } from "@/lib/integrations/kma-grid";
import { manualKmaLocationToGrid } from "@/lib/integrations/manual-kma-location";

type WeatherLocationPanelProps = {
  farmId: string;
  onSaved: () => void;
};

type WeatherLocationResponse = {
  weatherLocation: WeatherLocation | null;
};

type WeatherLocation = {
  gridX: number;
  gridY: number;
  label: string;
  updatedAt: string;
};

export function WeatherLocationPanel({ farmId, onSaved }: WeatherLocationPanelProps) {
  const [feedback, setFeedback] = useState<string | null>(null);
  const [grid, setGrid] = useState<KmaForecastGrid | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isLoadingSavedLocation, setIsLoadingSavedLocation] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [label, setLabel] = useState("");
  const [manualLatitude, setManualLatitude] = useState("");
  const [manualLongitude, setManualLongitude] = useState("");
  const [savedLocation, setSavedLocation] = useState<WeatherLocation | null>(null);

  useEffect(() => {
    let active = true;

    async function loadSavedLocation() {
      try {
        const response = await fetch(`/api/farms/${farmId}/weather-location`);
        if (!response.ok) throw new Error("Weather location request failed");
        const result = (await response.json()) as WeatherLocationResponse;
        if (!active || !result.weatherLocation) return;

        setSavedLocation(result.weatherLocation);
        setLabel(result.weatherLocation.label);
        setGrid({ x: result.weatherLocation.gridX, y: result.weatherLocation.gridY });
      } catch {
        if (active) {
          setFeedback("저장된 날씨 위치를 확인하지 못했습니다. 새 위치 확인과 저장은 계속 할 수 있습니다.");
        }
      } finally {
        if (active) setIsLoadingSavedLocation(false);
      }
    }

    void loadSavedLocation();
    return () => {
      active = false;
    };
  }, [farmId]);

  function handleUseDeviceLocation() {
    setFeedback(null);
    if (!navigator.geolocation) {
      setFeedback("이 기기에서는 위치 확인을 지원하지 않습니다. 농장에 있는 휴대전화나 태블릿에서 다시 시도해 주세요.");
      return;
    }

    setIsLocating(true);
    setFeedback("농장에 있는 기기의 현재 위치를 확인하는 중입니다. 최대 30초 정도 걸릴 수 있습니다.");
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
      (error) => {
        setFeedback(geolocationFailureMessage(error));
        setIsLocating(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 30_000 },
    );
  }

  function handleUseManualLocation() {
    const result = manualKmaLocationToGrid(manualLatitude, manualLongitude);
    if (!result.ok) {
      setFeedback(result.message);
      return;
    }

    setGrid(result.grid);
    setManualLatitude("");
    setManualLongitude("");
    setFeedback("입력한 위치를 기상청 예보 격자로 확인했습니다. 입력한 위도·경도는 이 화면에서 바로 지워지며 저장하거나 서버로 보내지 않습니다.");
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
      if (!result.weatherLocation) {
        throw new Error("Weather location save returned no data");
      }
      setSavedLocation(result.weatherLocation);
      setLabel(result.weatherLocation.label);
      setGrid({ x: result.weatherLocation.gridX, y: result.weatherLocation.gridY });
      onSaved();
      setFeedback("예보 위치를 저장했습니다. 아래 ‘오늘 날씨 보기’에서 공식 기상청 정보를 확인해 주세요.");
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
          <input
            maxLength={100}
            name="label"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="예: A농장 · 김제시 백구면"
            required
            value={label}
          />
        </label>
        <button disabled={isLocating || isSaving} onClick={handleUseDeviceLocation} type="button">
          {isLocating ? "위치 확인 중..." : "이 기기의 위치로 예보 위치 확인 (최대 30초)"}
        </button>
        <details className="weather-location-fallback">
          <summary>기기 위치가 안 될 때 보조 입력 사용</summary>
          <p className="field-hint">지도에서 확인한 위도와 경도를 한 번만 입력하면, 이 기기 안에서 기상청 예보 격자로 바꿉니다.</p>
          <div className="weather-coordinate-fields">
            <label>
              위도
              <input
                disabled={isSaving}
                inputMode="decimal"
                onChange={(event) => setManualLatitude(event.target.value)}
                placeholder="예: 35.9123"
                value={manualLatitude}
              />
            </label>
            <label>
              경도
              <input
                disabled={isSaving}
                inputMode="decimal"
                onChange={(event) => setManualLongitude(event.target.value)}
                placeholder="예: 126.1234"
                value={manualLongitude}
              />
            </label>
          </div>
          <button disabled={isSaving} onClick={handleUseManualLocation} type="button">입력한 위치로 예보 격자 확인</button>
          <p className="field-hint">위도·경도는 서버·DB·로그에 전송하거나 저장하지 않습니다. 이 보조 입력은 위치 권한을 켤 수 없는 경우에만 사용하세요.</p>
        </details>
        {grid ? <p className="weather-grid-preview">현재 사용할 기상청 예보 격자: X {grid.x} · Y {grid.y}</p> : null}
        <p className="field-hint">기기의 GPS 좌표나 상세 주소는 저장하거나 서버로 보내지 않습니다. 약 5km 단위의 기상청 예보 격자만 농장에 저장합니다.</p>
        <button disabled={!grid || label.trim().length === 0 || isSaving} type="submit">
          {isSaving ? "저장 중..." : "농장 날씨 위치 저장"}
        </button>
      </form>
      {isLoadingSavedLocation ? <p className="field-hint">저장된 날씨 위치를 확인하는 중입니다.</p> : null}
      {savedLocation ? (
        <div className="weather-location-saved" aria-live="polite">
          <strong>저장된 농장 날씨 위치</strong>
          <p>{savedLocation.label} · 기상청 예보 격자 X {savedLocation.gridX} · Y {savedLocation.gridY}</p>
          <a href="#today-weather-heading">오늘 날씨 보기</a>
        </div>
      ) : null}
      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
