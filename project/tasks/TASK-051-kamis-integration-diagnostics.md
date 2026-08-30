# TASK-051: KAMIS 시장정보 연동 실패 진단

## Goal

배포 환경에서 KAMIS 시장정보 카드가 unavailable일 때 API 키나 원문 응답을 노출하지 않고 실패 유형을 운영 로그에서 확인한다.

## Background

KAMIS adapter와 Today 카드의 실패 격리는 구현되어 있지만, 기존 catch 경로는 모든 원인을 같은 사용자 안내로만 반환해 배포 자격증명·provider 거절·네트워크 문제를 구분할 수 없었다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `AGENTS.md`
- `docs/API_CONTRACT.md`
- `docs/INTEGRATION_CONTRACT.md`
- Issue #79

## Scope

- KAMIS adapter의 자격증명, HTTP, timeout/network, provider error-code와 응답 형식 실패를 안전하게 분류한다.
- Market route가 Farm ID, 요청 URL, 자격증명, provider body 없이 구조화된 실패 분류만 기록하게 한다.
- 기존 unavailable/stale 계약과 UI 문구를 유지한다.

## Out of Scope

- KAMIS API key 또는 provider 원문 응답의 클라이언트·DB·로그 노출
- 가격 예측, 지역 시장 비교, Core 도메인 또는 DB migration 변경

## Allowed Files

- `apps/web/src/lib/integrations/kamis-market.*`
- `apps/web/src/app/api/farms/[farmId]/information/market/**`
- `docs/INTEGRATION_CONTRACT.md`
- `project/tasks/**`

## Restricted Files

- Core transaction, Auth/RLS semantics, client-side environment variables

## Input

- Server-only `KAMIS_CERT_ID`, `KAMIS_CERT_KEY`
- Selected Farm and CropCycle market-reference request

## Output

- Vercel server log의 sanitized KAMIS failure classification
- 기존의 사용자 안전 unavailable/stale `IntegrationResult`

## Acceptance Criteria

- [x] Missing credential, provider error-code, HTTP failure 및 timeout/network를 구분할 수 있다.
- [x] 로그는 request URL, credential, provider body, Farm context를 포함하지 않는다.
- [x] KAMIS failure가 Today/Core 흐름을 실패시키지 않는다.

## Required Tests

- [x] KAMIS adapter provider-error 및 HTTP classification
- [x] Market route sanitized logging
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Baseline Module 작업이며 Core/Crop Pack/Lab 경계를 변경하지 않는다.
- 작물 전용 Core 분기나 Mock 가격을 추가하지 않는다.
- API key는 server-only로 유지하며 로그에도 기록하지 않는다.

## Handoff

- DB/API JSON contract 변경 없음
- 배포 후 KAMIS 재시도와 Vercel 운영 로그 확인이 필요하다.
