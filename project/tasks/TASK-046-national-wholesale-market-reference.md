# TASK-046: 전국 도매 참고가격 연동

## Goal

현재 작기의 Crop Pack 매핑을 사용해 Today에서 KAMIS 전체지역 도매 참고가격을 안전하게 보여 준다.

## Background

v0.2 Pilot은 실제 공공 참고정보를 Today에 연결한다. 시장정보는 농가 수취가나 수익 예측이 아니라, 출처·시장 기준·등급·단위·기준일을 갖춘 참고값이어야 한다. Product Owner는 서울 단일 시장이 아닌 전국 공통 기준을 첫 기준으로 결정했다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `docs/INTEGRATION_CONTRACT.md`
- `docs/PUBLIC_DATA_SOURCES.md`
- Issue #69

## Scope

- KAMIS `dailyPriceByCategoryList`를 server-only adapter로 연결한다.
- region parameter를 생략한 KAMIS `전체지역` wholesale (`02`) 문맥을 사용한다.
- Crop Pack에 KAMIS category/item/preferred-grade 데이터를 등록하고 exact item-name match를 요구한다.
- Farm-scoped `external_data_snapshots` cache, 6-hour fresh TTL, 48-hour stale fallback을 제공한다.
- Today에 기준·품목/제공 품종·등급·단위·기준일과 safe wording을 표시한다.

## Out of Scope

- Farm별 출하시장 설정과 지역 도매가 비교
- 소매가, 가격·수확량·수익 예측
- 농가 수취가 추정, 자동 작업·추천
- Crop Pack에 등록되지 않은 작물의 가격 추정

## Allowed Files

- `apps/web/src/app/api/farms/[farmId]/information/market/**`
- `apps/web/src/app/components/**`
- `apps/web/src/lib/integrations/**`
- `apps/web/src/lib/crop-packs/**`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/styles.css`
- `supabase/migrations/**`
- `docs/**`, `README.md`, `.env.example`, `project/tasks/**`

## Restricted Files

- Existing Core transactions, auth/RLS policy semantics and TaskTemplate fixtures
- Client-side environment variables and raw provider-payload storage

## Input

- Accessible Farm ID and selected CropCycle ID
- Crop Pack KAMIS mapping
- Server-only `KAMIS_CERT_KEY` and `KAMIS_CERT_ID`

## Output

- Normalized `MarketReferenceIntegrationResult`
- Today market card or an honest unavailable/stale message

## Acceptance Criteria

- [x] A Farm member can request the selected CropCycle’s KAMIS market reference.
- [x] The default provider context is whole-region wholesale, and the UI says “전국 도매 참고가”.
- [x] Exact Crop Pack item matching is used; unregistered crops do not receive another crop’s price.
- [x] The result has item, provider kind when supplied, grade, unit, base date and current/preceding value when supplied.
- [x] Provider/key failure returns safe unavailable or stale data and does not block Today/Core.
- [x] Price wording states that it is not a Farm sale price, receipt price or revenue forecast.

## Required Tests

- [x] KAMIS adapter success, exact item mismatch and missing credentials
- [x] Market route context, cache, stale fallback and Crop Pack mapping
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- This is a Baseline Module, not Core or Lab.
- No crop-specific Core branch is added; strawberry is a Crop Pack profile entry.
- KAMIS credentials remain server-only and provider JSON is not returned or stored.
- KAMIS information is an official reference with provenance, not an agricultural treatment or sale-price prediction.

## Handoff

- Migration: `202608270003_platform_v02_national_market_reference.sql`
- Contract changes: Market API, snapshot module whitelist, Crop Pack mapping and cache policy
- Remaining risk: KAMIS account terms/attribution and real credential response must be checked in the deployed Pilot.
- Follow-up: Farm-configured local wholesale-market comparison after actual shipping context is collected.
