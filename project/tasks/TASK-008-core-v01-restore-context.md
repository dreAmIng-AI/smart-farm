# TASK-008: Core v0.1 저장된 Farm·CropCycle 다시 열기

## Goal

로그인 사용자가 이전에 생성한 접근 가능한 Farm과 CropCycle을 다시 선택해 기존 일정, Today, 이력을 이어서 볼 수 있게 한다.

## Background

Core v0.1의 계획·실행·기록은 이미 Farm과 CropCycle에 연결돼 저장된다. 기존 UI는 새로 생성한 항목만 메모리에서 선택할 수 있어 새로고침 또는 재로그인 후 기존 데이터를 다시 열 수 없었다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (FR-01, FR-02, FR-04, FR-05, FR-09)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- 로그인 사용자의 Farm 목록 조회와 선택 UI
- 선택 Farm의 CropCycle 목록 조회와 선택 UI
- 선택 CropCycle의 기존 일정, Today, 이력 재조회
- 새 Farm·CropCycle 생성 또는 Farm 기본정보 수정 후 목록 상태 갱신
- API 계약·도메인 문서·Route Handler 테스트 갱신

## Out of Scope

- Farm 삭제, CropCycle 종료, FarmMembership 관리
- 선택만으로 TaskTemplate 적용 또는 FarmTask 재생성
- 새 테이블·migration, Weather/AI/Disease/Sensor/Market

## Allowed Files

- `apps/web/src/app/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Restricted Files

- 기존 migration 수정 또는 새 migration 추가 금지: 기존 FarmMembership RLS와 테이블로 충족한다.
- RLS 우회, Service Role 사용, 작물·품종별 Core 분기 금지

## Input

- 로그인 Supabase 세션
- RLS로 접근 가능한 Farm과 CropCycle ID

## Output

- 선택 가능한 camelCase Farm·CropCycle 목록
- 선택 항목에 연결된 기존 일정, Today, 이력 표시

## Acceptance Criteria

- [x] 로그인 사용자는 RLS가 허용한 Farm 목록만 조회할 수 있다.
- [x] 선택한 Farm의 CropCycle만 조회·선택할 수 있다.
- [x] 선택한 CropCycle의 기존 일정과 Farm의 Today·이력을 다시 불러온다.
- [x] 선택만으로 FarmTask를 자동 생성하거나 기존 일정을 변경하지 않는다.
- [x] 새 migration 없이 기존 RLS를 재사용한다.

## Required Tests

- [x] Farm 목록 API의 camelCase 반환
- [x] 접근 가능한 Farm의 CropCycle 목록 조회
- [x] 접근 불가 Farm에서 CropCycle 조회 거부
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 Crop Pack 또는 Lab이 아니다.
- 목록 조회와 하위 조회 모두 Route Handler와 Supabase RLS가 같은 로그인 사용자의 FarmMembership를 확인한다.
- 저장된 데이터를 다시 여는 동작은 농업 처방, 진단, 자동 제어 또는 작업 생성이 아니다.
- Crop 이름·품종·Fixture에 따른 분기가 없다.

## Handoff

- DB migration과 Supabase SQL 실행은 필요 없다.
- Farm 삭제, CropCycle 종료, FarmMembership 관리는 별도 Task로 분리한다.
