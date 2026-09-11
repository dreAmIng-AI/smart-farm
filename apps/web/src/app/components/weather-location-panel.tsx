"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";

import { locateDevicePosition, requestBrowserPosition } from "@/lib/integrations/device-geolocation";
import { geolocationFailureMessage } from "@/lib/integrations/geolocation-feedback";
import {
  searchKmaMunicipalityForecastRegions,
  type KmaMunicipalityForecastRegion,
} from "@/lib/integrations/kma-municipality-forecast-regions";
import { toKmaForecastGrid, type KmaForecastGrid } from "@/lib/integrations/kma-grid";

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
  const [municipalityQuery, setMunicipalityQuery] = useState("");
  const [savedLocation, setSavedLocation] = useState<WeatherLocation | null>(null);
  const [selectedMunicipality, setSelectedMunicipality] = useState<KmaMunicipalityForecastRegion | null>(null);

  const municipalityResults = useMemo(
    () => searchKmaMunicipalityForecastRegions(municipalityQuery),
    [municipalityQuery],
  );

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

  function handleSelectMunicipality(region: KmaMunicipalityForecastRegion) {
    setSelectedMunicipality(region);
    setMunicipalityQuery("");
    setLabel(region.label);
    setGrid({ x: region.gridX, y: region.gridY });
    setFeedback(`${region.label}을 예보 기준 지역으로 선택했습니다. 이 지역의 약 5km 단위 기상청 예보를 보여 드립니다.`);
  }

  function handleUseDeviceLocation() {
    setFeedback(null);
    if (!navigator.geolocation) {
      setFeedback("이 기기에서는 위치 확인을 지원하지 않습니다. 시·군·구 검색으로 예보 기준 지역을 선택해 주세요.");
      return;
    }

    setIsLocating(true);
    setFeedback("현재 기기의 일반 위치를 먼저 확인한 뒤, 필요할 때만 더 정확한 위치를 다시 확인합니다.");
    void locateDevicePosition(requestBrowserPosition).then((result) => {
      if (!result.ok) {
        setFeedback(geolocationFailureMessage(result.error));
        setIsLocating(false);
        return;
      }

      const nextGrid = toKmaForecastGrid(result.coordinates.latitude, result.coordinates.longitude);
      if (!nextGrid) {
        setFeedback("이 위치는 기상청 동네예보 범위에서 확인하지 못했습니다. 시·군·구 검색으로 예보 기준 지역을 선택해 주세요.");
      } else {
        setSelectedMunicipality(null);
        setGrid(nextGrid);
        setLabel((currentLabel) => currentLabel.trim() || "내 기기 위치");
        setFeedback(result.usedHighAccuracy
          ? "내 기기 위치로 예보 기준을 확인했습니다. 바로 저장할 수 있습니다."
          : "내 기기의 일반 위치로 예보 기준을 확인했습니다. 바로 저장할 수 있습니다.");
      }
      setIsLocating(false);
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedLabel = new FormData(event.currentTarget).get("label");
    if (!grid) {
      setFeedback("먼저 시·군·구를 검색해 예보 기준 지역을 선택해 주세요. 찾는 지역이 없으면 아래에서 내 기기 위치를 사용할 수 있습니다.");
      return;
    }

    setFeedback(null);
    setIsSaving(true);
    try {
      const response = await fetch(`/api/farms/${farmId}/weather-location`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: submittedLabel, gridX: grid.x, gridY: grid.y }),
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
      setFeedback("예보 기준 지역을 저장했습니다. 아래 ‘오늘 날씨 보기’에서 공식 기상청 정보를 확인해 주세요.");
    } catch {
      setFeedback("예보 기준 지역을 저장하지 못했습니다. 지역 이름을 확인한 뒤 다시 시도해 주세요.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="card weather-location-panel stack" aria-labelledby="weather-location-heading">
      <div>
        <p className="eyebrow">공식 참고정보</p>
        <h2 id="weather-location-heading">농장 날씨 위치</h2>
        <p className="muted">시·군·구를 검색해 예보 기준 지역을 고르면 오늘 날씨를 볼 수 있습니다.</p>
      </div>
      <form className="weather-location-form stack" onSubmit={handleSave}>
        <div className="weather-municipality-search">
          <label htmlFor="weather-municipality-search">
            예보 기준 지역 검색
          </label>
          <input
            autoComplete="off"
            id="weather-municipality-search"
            onChange={(event) => setMunicipalityQuery(event.target.value)}
            placeholder="예: 김제시, 종로구, 강릉시"
            type="search"
            value={municipalityQuery}
          />
          <p className="field-hint">시·군·구 대표 지점의 기상청 동네예보입니다. 검색한 지역명은 외부 서비스로 전송되지 않습니다.</p>
          {municipalityQuery.trim() && municipalityResults.length === 0 ? (
            <p className="weather-municipality-empty">찾는 시·군·구가 없습니다. 시·도 또는 시·군·구 이름으로 다시 검색해 주세요.</p>
          ) : null}
          {municipalityResults.length > 0 ? (
            <ul className="weather-municipality-results" aria-label="예보 기준 지역 검색 결과">
              {municipalityResults.map((region) => (
                <li key={region.label}>
                  <button disabled={isSaving} onClick={() => handleSelectMunicipality(region)} type="button">
                    <strong>{region.municipality}</strong>
                    <span>{region.province} · 기상청 예보 기준</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {selectedMunicipality ? (
          <p className="weather-municipality-selected">
            선택한 예보 기준 지역: <strong>{selectedMunicipality.label}</strong>
          </p>
        ) : null}

        <label>
          예보 기준 지역 이름
          <input
            maxLength={100}
            name="label"
            onChange={(event) => setLabel(event.target.value)}
            placeholder="시·군·구를 검색해 선택해 주세요"
            required
            value={label}
          />
        </label>
        <p className="field-hint">선택한 지역의 이름을 알아보기 쉽게 남길 수 있습니다. 상세 주소나 GPS 좌표는 저장하지 않습니다.</p>

        <details className="weather-location-advanced">
          <summary>검색한 지역이 없나요?</summary>
          <p className="field-hint">휴대전화 등에서 내 기기 위치를 사용해 예보 기준을 자동으로 설정할 수 있습니다. 위치 권한을 허용해 주세요.</p>
          <button disabled={isLocating || isSaving} onClick={handleUseDeviceLocation} type="button">
            {isLocating ? "위치 확인 중..." : "내 기기 위치로 자동 설정"}
          </button>
        </details>

        {grid ? <p className="weather-grid-preview">예보 기준 지역이 선택되었습니다.</p> : null}
        <p className="field-hint">실제 농장 안의 실측 날씨가 아닌, 선택한 지역의 약 5km 단위 기상청 예보를 보여 드립니다.</p>
        <button disabled={!grid || label.trim().length === 0 || isSaving} type="submit">
          {isSaving ? "저장 중..." : "예보 기준 지역 저장"}
        </button>
      </form>
      {isLoadingSavedLocation ? <p className="field-hint">저장된 예보 기준 지역을 확인하는 중입니다.</p> : null}
      {savedLocation ? (
        <div className="weather-location-saved" aria-live="polite">
          <strong>저장된 예보 기준 지역</strong>
          <p>{savedLocation.label} · 기상청 동네예보</p>
          <a href="#today-weather-heading">오늘 날씨 보기</a>
        </div>
      ) : null}
      {feedback ? <p className="inline-status" role="status">{feedback}</p> : null}
    </section>
  );
}
