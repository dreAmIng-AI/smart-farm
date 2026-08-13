# TASK-005: Core v0.1 현재 생육 단계 변경

## Goal

사용자가 접근 가능한 CropCycle의 현재 생육 단계를 Crop Pack 용어로 기록·변경·비울 수 있게 한다.

## Background

P0 Work Cycle과 P1 사진 첨부가 완료되었다. PRD P1의 남은 항목인 현재 생육 단계 변경은 기존 `crop_cycles.growth_stage` 컬럼과 RLS update 정책을 재사용해 최소 구현한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (P1 현재 생육단계 변경)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- 접근 가능한 CropCycle의 `growth_stage` PATCH API
- null 또는 빈 입력으로 현재 생육 단계 비우기
- 현재 단계 표시와 Mobile First 자유 입력 UI
- 입력 검증, RLS 접근 거부, 구현 계약과 테스트

## Out of Scope

- Crop Pack 단계 목록·enum·작물별 자동 추천
- 생육 단계 변경에 따른 FarmTask 자동 생성, 취소, 재일정
- 현재 단계 변경 이력 전용 테이블, AI·Weather·Disease·Sensor·Market

## Allowed Files

- `apps/web/src/app/api/crop-cycles/`
- `apps/web/src/app/page.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/api/validation.*`
- `README.md`, `docs/`, `project/tasks/`

## Restricted Files

- `supabase/migrations/` (기존 컬럼과 RLS 정책으로 충족되어 수정하지 않음)
- 외부 Integration, Crop Pack 전용 서비스, AI 관련 경로

## Input

- 인증된 Supabase 세션
- 접근 가능한 CropCycle UUID
- `growthStage`: 최대 100자의 문자열, 빈 문자열 또는 null

## Output

- 갱신된 CropCycle과 UI의 현재 생육 단계 표시
- 기존 FarmTask 일정은 변경하지 않음

## Acceptance Criteria

- [ ] 접근 가능한 CropCycle의 현재 생육 단계를 저장·비울 수 있다.
- [ ] 잘못된 UUID·입력은 400, 접근할 수 없는 CropCycle은 404로 거부한다.
- [ ] 작물·품종별 하드코딩 없이 다른 Crop Pack 용어도 저장할 수 있다.
- [ ] 생육 단계 변경이 기존 FarmTask를 자동 변경하지 않는다.

## Required Tests

- [ ] 생육 단계 입력·비우기·길이 검증
- [ ] CropCycle PATCH 성공 및 RLS 접근 거부
- [ ] lint, typecheck, test, build

## Security and Domain Safety

- Core Platform Slice이며 Crop Pack 단계 용어는 데이터로 취급한다.
- RLS를 우회하거나 Service Role을 사용하지 않는다.
- Crop-specific Core hardcoding이 없다.
- 생육 단계는 현재 상태 기록일 뿐 검증된 농업 처방·자동 제어가 아니다.
- Lab 결과와 외부 데이터는 Core의 선행 조건이 아니다.

## Handoff

- 새 DB migration이나 Supabase SQL 실행은 필요 없다.
- API 계약·Data Dictionary·Architecture·README를 함께 갱신한다.
- 다음 기능은 실제 사용자 검증에서 필요한 작은 개선을 우선순위로 결정한다.
