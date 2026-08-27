"use client";

import { useCallback, useEffect, useState } from "react";

import type { MarketReferenceIntegrationResult } from "@/app/api/farms/[farmId]/information/market/route";

type MarketReferenceCardProps = {
  cropCycleId: string;
  cropLabel: string;
  farmId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function formatWon(value: number) {
  return `${new Intl.NumberFormat("ko-KR").format(value)}원`;
}

function comparisonText(priceWon: number, previousPriceWon: number | null) {
  if (previousPriceWon === null) return "직전 확인값 정보 없음";
  const difference = priceWon - previousPriceWon;
  if (difference === 0) return "직전 확인값과 같음";
  return `직전 확인값보다 ${difference > 0 ? "높음" : "낮음"} · ${formatWon(Math.abs(difference))}`;
}

async function fetchMarketReference(farmId: string, cropCycleId: string) {
  const query = new URLSearchParams({ cropCycleId });
  const response = await fetch(`/api/farms/${farmId}/information/market?${query.toString()}`);
  if (!response.ok) throw new Error("Market reference request failed");
  return response.json() as Promise<MarketReferenceIntegrationResult>;
}

export function MarketReferenceCard({ cropCycleId, cropLabel, farmId }: MarketReferenceCardProps) {
  const [result, setResult] = useState<MarketReferenceIntegrationResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loadMarketReference = useCallback(() => fetchMarketReference(farmId, cropCycleId), [farmId, cropCycleId]);

  useEffect(() => {
    let active = true;
    void loadMarketReference()
      .then((nextResult) => {
        if (active) setResult(nextResult);
      })
      .catch(() => {
        if (active) {
          setResult({
            status: "unavailable",
            data: null,
            message: "시장정보를 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.",
          });
        }
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [loadMarketReference]);

  if (isLoading || !result) {
    return (
      <section className="today-home-market" aria-labelledby="market-reference-heading" aria-live="polite">
        <h3 id="market-reference-heading">시장 참고가격</h3>
        <p>공식 시장정보를 불러오는 중입니다.</p>
      </section>
    );
  }

  if (result.status === "unavailable") {
    return (
      <section className="today-home-market today-home-market-unavailable" aria-labelledby="market-reference-heading">
        <h3 id="market-reference-heading">시장 참고가격</h3>
        <p>{result.message}</p>
      </section>
    );
  }

  const { data, provenance } = result;
  return (
    <section className="today-home-market" aria-labelledby="market-reference-heading">
      <div className="today-home-section-heading">
        <div>
          <h3 id="market-reference-heading">시장 참고가격</h3>
          <p>{cropLabel} · 전국 도매 참고가</p>
        </div>
        <strong>{formatWon(data.priceWon)}</strong>
      </div>
      <dl className="market-reference-facts">
        <div><dt>기준</dt><dd>{data.marketName} · 도매</dd></div>
        <div><dt>품목</dt><dd>{data.itemName}{data.kindName ? ` · ${data.kindName}` : ""}</dd></div>
        <div><dt>등급 · 단위</dt><dd>{data.grade} · {data.unit}</dd></div>
        <div><dt>기준일</dt><dd>{formatDate(data.baseDate)}</dd></div>
      </dl>
      <p className="market-comparison">{comparisonText(data.priceWon, data.previousPriceWon)}</p>
      <p className="market-safety-note">전체지역 도매 기준의 시장 참고가격입니다. 농장 판매가나 예상 수익이 아닙니다.</p>
      {result.status === "stale" ? <p className="weather-stale">{result.message}</p> : null}
      <p className="weather-source"><a href={provenance.sourceReference} rel="noreferrer" target="_blank">{provenance.sourceName}</a> · {formatTime(provenance.retrievedAt)} 확인</p>
    </section>
  );
}
