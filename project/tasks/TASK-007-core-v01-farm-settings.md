# TASK-007: Core v0.1 Farm 기본정보 수정

## Goal

권한 있는 Farm 구성원이 현재 선택한 Farm의 기본정보를 모바일 UI에서 확인·수정할 수 있게 한다.

## Background

PRD FR-01은 로그인 사용자가 Farm을 생성, 조회, 수정할 수 있어야 한다고 정의한다. Foundation migration에는 Farm UPDATE RLS와 `updated_at` trigger가 이미 있지만, 기존 UI에는 Farm 생성만 있고 기본정보 수정 흐름이 없었다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (FR-01)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- 단건 Farm 조회·수정 Route Handler
- 현재 선택한 Farm의 이름, 지역 코드, 재배 환경, 재배 방식 편집 UI
- 기존 Farm 입력 검증, FarmMembership RLS, `updated_at` trigger 재사용
- 계약 문서과 API 테스트 갱신

## Out of Scope

- Farm 목록 선택·삭제·소유권 또는 구성원 관리
- CropCycle·FarmTask·이력 자동 변경
- 새 Farm 속성, 새 테이블·migration, Weather/AI/Disease/Sensor/Market

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Restricted Files

- 기존 migration 수정 또는 새 migration 추가 금지: 기존 스키마와 RLS로 충족한다.
- RLS 우회, Service Role 사용, 작물별 Core 분기 금지

## Input

- 접근 가능한 Farm ID
- `name`, `regionCode`, `cultivationEnvironment`, `cultivationMethod`

## Output

- 갱신된 camelCase Farm 객체와 UI의 현재 Farm 표시

## Acceptance Criteria

- [x] 접근 가능한 Farm을 조회할 수 있다.
- [x] 필수 Farm 정보가 유효하면 기본정보를 수정할 수 있다.
- [x] 접근할 수 없는 Farm은 조회·수정되지 않는다.
- [x] 수정으로 하위 CropCycle, FarmTask, ActionLog, IssueRecord를 변경하지 않는다.
- [x] 새 migration 없이 기존 RLS와 `updated_at` trigger를 재사용한다.

## Required Tests

- [x] API 조회·수정·접근 불가 거부
- [x] 기존 Farm 입력 검증
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 Crop Pack 또는 Lab이 아니다.
- Route Handler와 Supabase RLS가 같은 로그인 사용자의 FarmMembership를 확인한다.
- 기본정보 수정은 농업 처방·진단 또는 작업 자동 생성이 아니다.
- 작물·품종별 조건문과 Fixture 변경이 없다.

## Handoff

- DB migration과 Supabase SQL 실행은 필요 없다.
- Farm 목록·구성원 관리는 실제 사용자 검증이 필요해질 때 별도 Task로 분리한다.
