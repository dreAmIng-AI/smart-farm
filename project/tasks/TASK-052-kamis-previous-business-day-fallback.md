# TASK-052: KAMIS 최근 기준일 가격 fallback

## Goal

KAMIS가 휴장일의 당일 카테고리 가격을 비워 반환해도 최근 공식 기준일의 전국 도매 참고가를 보여 준다.

## Background

Production 운영 로그에서 `KAMIS_EMPTY_RESPONSE`를 확인했다. 인증정보와 배포는 정상이며, KAMIS가 주말·휴장일의 당일 `dailyPriceByCategoryList`에 항목을 반환하지 않는 경우가 있다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `AGENTS.md`
- `docs/INTEGRATION_CONTRACT.md`
- Issue #81

## Scope

- 오늘부터 최대 7일 전까지 KAMIS 조회일을 순서대로 확인한다.
- `KAMIS_EMPTY_RESPONSE`일 때만 다음 날짜를 확인한다.
- 실제 provider 기준일을 그대로 보존하고 기존 stale cache 정책을 유지한다.

## Out of Scope

- 가상 가격, 가격 예측, 지역 출하시장 비교, DB migration
- 자격증명·provider 원문 응답의 노출

## Allowed Files

- `apps/web/src/lib/integrations/kamis-market.*`
- `docs/INTEGRATION_CONTRACT.md`
- `project/tasks/**`

## Restricted Files

- Core transaction, Auth/RLS, client-side environment variables

## Input

- KAMIS server-only credentials
- Selected Crop Pack market-reference mapping

## Output

- 실제 KAMIS 기준일을 포함한 `MarketReferenceData`, 또는 기존 unavailable/stale 결과

## Acceptance Criteria

- [x] 휴장일 empty 응답 뒤 최근 날짜의 KAMIS 가격을 반환한다.
- [x] 7일 모두 empty이면 기존 unavailable/stale path를 유지한다.
- [x] HTTP·자격증명·provider-code 오류에 날짜 fallback을 적용하지 않는다.
- [x] provider base date와 전국 도매 참고가의 비예측 표현을 유지한다.

## Required Tests

- [x] KAMIS empty 응답 뒤 이전 날짜 성공
- [x] 7일 empty 유지
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Baseline Module 작업이며 Core/Crop Pack/Lab 경계를 변경하지 않는다.
- Mock 가격이나 작물 전용 Core 분기를 추가하지 않는다.
- KAMIS key는 server-only로 유지한다.

## Handoff

- DB/API JSON contract 변경 없음
- Production에서 휴장일 포함 실데이터 확인 필요
