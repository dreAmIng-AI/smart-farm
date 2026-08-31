# TASK-056 — 공공 병해충 원문을 서비스 안에서 읽기

- GitHub Issue: #89
- Status: In review

## Goal

농사로 병해충 발생정보의 제목만 보거나 PDF를 내려받지 않고, 접근 권한이 있는 농장 사용자가 서비스 안에서 공식 원문을 읽을 수 있게 한다.

## Background

현재 농장 데이터에는 상세 주소가 아니라 자유 형식의 `region_code`만 있다. 따라서 주소만으로 기상청 5km 격자를 정확히 자동 설정할 수는 없다. 주소 기반 날씨 자동 설정은 공인 주소-좌표 변환 Provider, 보관 범위와 새로운 배포 자격증명을 별도로 결정해야 한다.

## References

- `docs/PRD_PLATFORM_V0.2.md`
- `docs/INTEGRATION_CONTRACT.md`
- `docs/API_CONTRACT.md`
- `AGENTS.md`
- GitHub Issue #89

## Scope

- 공식 Nongsaro PDF만 허용하는 Farm-access-checked inline reader route를 추가한다.
- Today의 병해충 카드에서 `원문 보기`를 `내용 읽기`로 바꾸고, 화면 안 읽기 창을 제공한다.
- 공식 원문, 진단·방제 지시 아님이라는 안전 문구를 유지한다.

## Out of Scope

- 병해충 진단·처방·자동 작업 생성
- PDF 원문 영구 저장, 외부 URL 범용 프록시
- 상세 주소·GPS 저장 또는 주소 기반 기상청 격자 자동 변환
- KMA, Nongsaro, KAMIS 자격증명 변경

## Allowed / Restricted Files

- Allowed: `apps/web/src/app/api/farms/[farmId]/information/disease-pest/**`, `apps/web/src/app/components/disease-pest-card.tsx`, `apps/web/src/lib/integrations/nongsaro-disease-pest.ts`, 관련 테스트와 계약 문서
- Restricted: Core Domain, Supabase migration/RLS, Crop Pack 농업 규칙, 외부 API key

## Acceptance Criteria

- [ ] 접근 가능한 Farm의 공식 Nongsaro PDF는 서비스 안 읽기 창에서 열린다.
- [x] 비공식 URL, 리디렉션, 비-PDF, 10MB 초과 문서는 프록시하지 않는다.
- [x] Farm 접근 권한이 없으면 외부 원문을 요청하지 않는다.
- [x] Today/기록 흐름은 원문 열기 실패와 무관하게 계속 동작한다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.

## Required Tests

- 공식 PDF inline response
- 비공식 URL 차단
- 접근 불가 Farm 차단

## Security and Domain Safety

- PDF는 저장하지 않고, HTTPS Nongsaro 출처와 최종 redirect를 확인한다.
- 원문 파일의 API key·Farm 이력·진단 정보는 반환하지 않는다.
- 전국 발생정보를 특정 Farm의 진단으로 표현하지 않는다.

## Handoff

- Supabase migration·SQL·Vercel 환경변수 변경이 필요 없다.
- 주소 기반 예보 위치 자동 설정은 공식 geocoding Provider와 개인정보 보관 결정을 받은 뒤 별도 Issue로 진행한다.
