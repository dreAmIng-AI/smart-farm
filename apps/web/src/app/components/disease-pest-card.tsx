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
  const [openBulletin, setOpenBulletin] = useState<{ attachmentUrl: string; title: string } | null>(null);
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
            {bulletin.attachmentUrl ? (
              <button onClick={() => setOpenBulletin({ attachmentUrl: bulletin.attachmentUrl as string, title: bulletin.title })} type="button">
                내용 읽기
              </button>
            ) : <span className="reference-bulletin-unavailable">원문 준비 중</span>}
          </li>
        ))}
      </ul>
      {result.status === "stale" ? <p className="weather-stale">{result.message}</p> : null}
      <p className="weather-source"><a href={provenance.sourceReference} rel="noreferrer" target="_blank">{provenance.sourceName}</a> · {formatTime(provenance.retrievedAt)} 확인</p>
      {openBulletin ? (
        <div aria-label={`${openBulletin.title} 내용 읽기`} aria-modal="true" className="reference-document-modal" role="dialog">
          <div className="reference-document-dialog">
            <div className="reference-document-heading">
              <div>
                <p className="eyebrow">공식 원문</p>
                <h4>{openBulletin.title}</h4>
              </div>
              <button aria-label="원문 닫기" className="secondary compact" onClick={() => setOpenBulletin(null)} type="button">닫기</button>
            </div>
            <p className="field-hint">농사로에서 발행한 원문을 서비스 안에서 바로 보여드립니다. 병해충 발생 진단이나 방제 지시가 아닙니다.</p>
            <iframe
              className="reference-document-frame"
              src={`/api/farms/${farmId}/information/disease-pest/document?${new URLSearchParams({ attachment: openBulletin.attachmentUrl, view: "embed" }).toString()}`}
              title={`${openBulletin.title} 공식 원문`}
            />
            <a href={openBulletin.attachmentUrl} rel="noreferrer" target="_blank">공식 사이트에서 열기</a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
