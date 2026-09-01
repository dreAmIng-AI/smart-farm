# TASK-057 — 공공 참고정보 실패 상태와 원문 읽기 경험 개선

- GitHub Issue: Pending — GitHub App Issue 권한이 없어 생성할 수 없음
- Status: In progress

## Goal

날씨·병해충·재배·시장 참고정보가 일시적으로 없거나 외부 제공자가 실패해도, 농장 사용자가 기술 오류를 보지 않고 다음 행동을 이해할 수 있게 한다.

## Background

Today의 공식 원문 읽기 창은 PDF를 가져오지 못하면 API JSON을 그대로 iframe에 표시했다. 각 Baseline Module도 배포 설정·공급자 응답·일시 네트워크 실패를 운영자가 구분하기 어려웠다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_PLATFORM_V0.2.md`
- `docs/UX_GUIDELINES.md`
- `docs/API_CONTRACT.md`
- `docs/INTEGRATION_CONTRACT.md`
- `AGENTS.md`

## Scope

- embedded 공식 원문 reader 실패 시 안전한 서비스 내 안내와 공식 원문 fallback 링크를 표시한다.
- KMA와 Nongsaro provider 실패를 API key·URL·Farm ID·원문 응답 없이 고정된 원인 코드로 서버 로그에 남긴다.
- 사용자에게는 missing context, 연결 미완료, 정확한 자료 없음, 일시 데이터 없음의 한국어 안내만 반환한다.
- 실패 메시지와 로그의 안전성을 테스트한다.

## Out of Scope

- 새 외부 provider 또는 주소 기반 지오코딩 추가
- Farm 상세 주소/GPS 저장, Weather 위치 모델 변경
- PDF 영구 보관 또는 원문 내용의 자체 재가공
- 농업 진단, 처방, 자동 작업 생성

## Allowed / Restricted Files

- Allowed: `apps/web/src/app/api/farms/[farmId]/information/**`, `apps/web/src/app/components/disease-pest-card.tsx`, `apps/web/src/lib/integrations/**`, 관련 테스트와 계약 문서
- Restricted: Core Domain, Supabase migration/RLS, Crop Pack 농업 규칙, 외부 API key

## Acceptance Criteria

- [x] embedded 원문 reader는 provider 실패 시 raw JSON/API code를 보여 주지 않는다.
- [x] 모든 새 provider 실패 로그는 고정된 안전 코드만 포함한다.
- [x] KMA와 Nongsaro unavailable 결과는 작업·기록 흐름을 막지 않는다.
- [ ] 배포 환경에서 Farm과 CropCycle을 선택한 실제 API 응답을 확인한다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.

## Required Tests

- [x] embedded PDF reader 오류 fallback
- [x] KMA/Nongsaro 안전 실패 분류
- [x] stale cache fallback 회귀
- [ ] 배포 환경 manual evidence

## Security and Domain Safety

- Baseline Module 범위이며 Core/작물별 분기를 추가하지 않는다.
- API key, 요청 URL, Farm ID, provider 응답 본문은 로그/클라이언트에 노출하지 않는다.
- 전국 병해충 정보와 재배 참고자료를 Farm 진단·방제 지시로 표현하지 않는다.
- Mock/Fixture 결과를 production UI 기본값으로 사용하지 않는다.

## Handoff

- DB migration·SQL·Vercel 환경변수 변경은 없다.
- 실제 제공자 응답 검사는 사용자의 Farm/CropCycle 선택 컨텍스트를 전송해야 하므로 명시적 사용자 확인 뒤 수행한다.
- 주소 기반 Weather 자동 설정은 별도 주소-좌표 Provider와 개인정보 보관 결정을 받은 뒤 다룬다.
