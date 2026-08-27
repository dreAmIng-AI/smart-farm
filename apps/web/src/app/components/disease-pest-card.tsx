"use client";

import { useCallback, useEffect, useState } from "react";

import type { DiseasePestIntegrationResult } from "@/app/api/farms/[farmId]/information/disease-pest/route";

type DiseasePestCardProps = {
  cropLabel: string;
  farmId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function fetchDiseasePest(farmId: string) {
  const response = await fetch(`/api/farms/${farmId}/information/disease-pest`);
  if (!response.ok) throw new Error("Disease/pest request failed");
  return response.json() as Promise<DiseasePestIntegrationResult>;
}

export function DiseasePestCard({ cropLabel, farmId }: DiseasePestCardProps) {
  const [result, setResult] = useState<DiseasePestIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadDiseasePest = useCallback(() => fetchDiseasePest(farmId), [farmId]);

  useEffect(() => {
    let active = true;
    void loadDiseasePest()
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch(() => {
        if (active) {
          setResult({
            status: "unavailable",
            data: null,
            message: "공식 병해충 발생정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadDiseasePest]);

  if (isLoading || !result) {
    return (
      <section className="today-home-reference" aria-labelledby="disease-pest-heading" aria-live="polite">
        <h3 id="disease-pest-heading">공식 병해충 발생정보</h3>
        <p>공식 정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (result.status === "unavailable") {
    return (
      <section className="today-home-reference today-home-reference-unavailable" aria-labelledby="disease-pest-heading">
        <h3 id="disease-pest-heading">공식 병해충 발생정보</h3>
        <p>{result.message}</p>
      </section>
    );
  }

  const { data, provenance } = result;
  return (
    <section className="today-home-reference" aria-labelledby="disease-pest-heading">
      <div className="today-home-section-heading">
        <div>
          <h3 id="disease-pest-heading">공식 병해충 발생정보</h3>
          <p>{cropLabel} 재배 중 참고</p>
        </div>
      </div>
      <p className="reference-safety-note">전국 단위 발생정보입니다. 농장에 병해충이 발생했다는 진단이나 방제 지시가 아닙니다.</p>
      <ul className="reference-bulletin-list">
        {data.bulletins.map((bulletin) => (
          <li key={`${bulletin.title}:${bulletin.publishedAt}`}>
            <div>
              <strong>{bulletin.title}</strong>
              <span>{formatDate(bulletin.publishedAt)} 발행</span>
            </div>
            {bulletin.attachmentUrl ? <a href={bulletin.attachmentUrl} rel="noreferrer" target="_blank">원문 보기</a> : null}
          </li>
        ))}
      </ul>
      {result.status === "stale" ? <p className="weather-stale">{result.message}</p> : null}
      <p className="weather-source"><a href={provenance.sourceReference} rel="noreferrer" target="_blank">{provenance.sourceName}</a> · {formatTime(provenance.retrievedAt)} 확인</p>
    </section>
  );
}
