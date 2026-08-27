"use client";

import { useCallback, useEffect, useState } from "react";

import type { CropReferenceIntegrationResult } from "@/app/api/farms/[farmId]/information/crop/route";

type CropReferenceCardProps = {
  cropCycleId: string;
  cropLabel: string;
  farmId: string;
};

function formatDate(value: string | null) {
  if (!value) return "등록일 정보 없음";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

async function fetchCropReference(farmId: string, cropCycleId: string) {
  const query = new URLSearchParams({ cropCycleId });
  const response = await fetch(`/api/farms/${farmId}/information/crop?${query.toString()}`);
  if (!response.ok) throw new Error("Crop reference request failed");
  return response.json() as Promise<CropReferenceIntegrationResult>;
}

export function CropReferenceCard({ cropCycleId, cropLabel, farmId }: CropReferenceCardProps) {
  const [result, setResult] = useState<CropReferenceIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadCropReference = useCallback(() => fetchCropReference(farmId, cropCycleId), [farmId, cropCycleId]);

  useEffect(() => {
    let active = true;
    void loadCropReference()
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch(() => {
        if (active) {
          setResult({
            status: "unavailable",
            data: null,
            message: "공식 재배 참고자료를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadCropReference]);

  if (isLoading || !result) {
    return (
      <section className="today-home-reference" aria-labelledby="crop-reference-heading" aria-live="polite">
        <h3 id="crop-reference-heading">재배 참고자료</h3>
        <p>현재 작물의 공식 자료를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (result.status === "unavailable") {
    return (
      <section className="today-home-reference today-home-reference-unavailable" aria-labelledby="crop-reference-heading">
        <h3 id="crop-reference-heading">재배 참고자료</h3>
        <p>{result.message}</p>
      </section>
    );
  }

  const { data, provenance } = result;
  return (
    <section className="today-home-reference" aria-labelledby="crop-reference-heading">
      <div className="today-home-section-heading">
        <div>
          <h3 id="crop-reference-heading">재배 참고자료</h3>
          <p>{cropLabel} · 농사로 기준 작물명 {data.officialCropName}</p>
        </div>
      </div>
      <p className="reference-safety-note">작물별 공식 참고자료입니다. 농장 상태의 진단이나 방제 지시가 아닙니다.</p>
      <ul className="reference-bulletin-list">
        {data.items.map((item) => (
          <li key={`${item.title}:${item.publishedAt ?? "unknown"}`}>
            <div>
              <strong>{item.title}</strong>
              <span>{formatDate(item.publishedAt)}</span>
            </div>
            {item.referenceUrl ? <a href={item.referenceUrl} rel="noreferrer" target="_blank">원문 보기</a> : null}
          </li>
        ))}
      </ul>
      {result.status === "stale" ? <p className="weather-stale">{result.message}</p> : null}
      <p className="weather-source"><a href={provenance.sourceReference} rel="noreferrer" target="_blank">{provenance.sourceName}</a> · {formatTime(provenance.retrievedAt)} 확인</p>
    </section>
  );
}
