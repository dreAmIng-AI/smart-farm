"use client";

import { useCallback, useEffect, useState } from "react";

import type { WeatherIntegrationResult } from "@/app/api/farms/[farmId]/information/weather/route";

type WeatherCardProps = {
  canConfigure: boolean;
  farmId: string;
  onConfigure?: () => void;
  standalone?: boolean;
};

function formatNumber(value: number | null, suffix: string) {
  return value === null ? "확인 중" : `${value}${suffix}`;
}

function formatTime(value: string | null) {
  if (!value) return "기준 시각 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function fetchWeather(farmId: string) {
  const response = await fetch(`/api/farms/${farmId}/information/weather`);
  if (!response.ok) throw new Error("Weather request failed");
  return response.json() as Promise<WeatherIntegrationResult>;
}

export function WeatherCard({ canConfigure, farmId, onConfigure, standalone = false }: WeatherCardProps) {
  const [result, setResult] = useState<WeatherIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadWeather = useCallback(() => fetchWeather(farmId), [farmId]);

  useEffect(() => {
    let active = true;
    void loadWeather()
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch(() => {
        if (active) {
          setResult({
            status: "unavailable",
            data: null,
            message: "최신 날씨 정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadWeather]);

  if (isLoading || !result) {
    return (
      <section className={standalone ? "today-home-weather today-home-weather-standalone" : "today-home-weather"} aria-labelledby="today-weather-heading" aria-live="polite">
        {standalone ? <h2 id="today-weather-heading">오늘 날씨</h2> : <h3 id="today-weather-heading">오늘 날씨</h3>}
        <p>공식 날씨 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (result.status === "unavailable") {
    return (
      <section className={`${standalone ? "today-home-weather today-home-weather-standalone" : "today-home-weather"} today-home-weather-unavailable`} aria-labelledby="today-weather-heading">
        {standalone ? <h2 id="today-weather-heading">오늘 날씨</h2> : <h3 id="today-weather-heading">오늘 날씨</h3>}
        <p>{result.message}</p>
        {canConfigure ? (
          onConfigure ? (
            <button className="weather-configuration-button" onClick={onConfigure} type="button">
              날씨 위치 설정
            </button>
          ) : <a href="#weather-location-heading">날씨 위치 설정</a>
        ) : null}
      </section>
    );
  }

  const { data, provenance } = result;
  return (
    <section className={standalone ? "today-home-weather today-home-weather-standalone" : "today-home-weather"} aria-labelledby="today-weather-heading">
      <div className="today-home-section-heading">
        <div>
          {standalone ? <h2 id="today-weather-heading">오늘 날씨</h2> : <h3 id="today-weather-heading">오늘 날씨</h3>}
          <p>{data.locationLabel}</p>
        </div>
        <strong>{formatNumber(data.temperatureC, "℃")}</strong>
      </div>
      <dl className="weather-facts">
        <div><dt>최고 / 최저</dt><dd>{formatNumber(data.highTemperatureC, "℃")} / {formatNumber(data.lowTemperatureC, "℃")}</dd></div>
        <div><dt>습도</dt><dd>{formatNumber(data.humidityPercent, "%")}</dd></div>
        <div><dt>비 올 가능성</dt><dd>{formatNumber(data.precipitationProbabilityPercent, "%")}</dd></div>
        <div><dt>바람</dt><dd>{formatNumber(data.windSpeedMps, "m/s")}</dd></div>
      </dl>
      {data.precipitationAmount ? <p className="weather-precipitation">예상 강수량: {data.precipitationAmount}</p> : null}
      {result.status === "stale" ? <p className="weather-stale">{result.message}</p> : null}
      <p className="weather-source"><a href={provenance.sourceReference} rel="noreferrer" target="_blank">{provenance.sourceName}</a> · {formatTime(provenance.retrievedAt)} 확인</p>
    </section>
  );
}
