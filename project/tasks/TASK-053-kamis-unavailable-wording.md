# TASK-053: KAMIS 공식 가격 미집계 안내

## Goal

최근 KAMIS 목록에 현재 작물의 정확한 가격 항목이 없을 때 이를 시스템 오류가 아닌 공식 가격 미집계 상태로 설명한다.

## Background

Production에서 휴장일 fallback 뒤 `KAMIS_ITEM_NOT_FOUND`가 확인됐다. 배포와 자격증명 오류가 아니라 해당 기간의 전체지역 공식 목록에 정확한 Crop Pack 품목이 없는 상태다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `AGENTS.md`
- `docs/INTEGRATION_CONTRACT.md`
- Issue #83

## Scope

- KAMIS item-missing / date-empty 상태별 사용자 안전 Korean message
- Market route 테스트와 Integration Contract 업데이트

## Out of Scope

- 유사 품목 대체, 가상 가격, 가격 예측, DB migration

## Allowed Files

- `apps/web/src/app/api/farms/[farmId]/information/market/**`
- `docs/INTEGRATION_CONTRACT.md`
- `project/tasks/**`

## Restricted Files

- Core transaction, Auth/RLS, client-side environment variables

## Input

- Normalized KAMIS failure classification

## Output

- 공식 가격 미집계 상태를 설명하는 unavailable `IntegrationResult`

## Acceptance Criteria

- [x] Exact Crop Pack item missing은 공식 집계 미확인으로 안내한다.
- [x] Raw provider data, credentials, Farm context를 표시하지 않는다.
- [x] 유사 품목이나 예측값으로 대체하지 않는다.

## Required Tests

- [x] KAMIS item-missing Korean unavailable message
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Baseline Module 작업이며 Core/Crop Pack/Lab 경계를 바꾸지 않는다.
- 시장 참고가격은 농가 수취가·예측가가 아니다.
- API key와 provider 원문은 server-only로 유지한다.

## Handoff

- DB/API JSON schema 변경 없음
- Strawberry 출하 시기 또는 KAMIS 공식 집계 갱신 뒤 live data 확인 필요
