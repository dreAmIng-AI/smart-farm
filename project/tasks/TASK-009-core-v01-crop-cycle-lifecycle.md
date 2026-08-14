# TASK-009: Core v0.1 CropCycle 종료

## Goal

권한 있는 Farm 구성원이 진행 중 CropCycle을 완료 또는 취소로 종료하고, 종료된 작기에서 새 자동 작업 계획이 생성되지 않게 한다.

## Background

기존 `crop_cycles`에는 이미 `status(active, completed, cancelled)`와 `ended_at`이 있고, `generate_planned_farm_tasks` RPC도 active 작기만 처리한다. 그러나 UI와 API에는 작기 종료 흐름이 없고, UPDATE RLS만으로는 terminal 상태를 DB에서 보장할 수 없었다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (FR-02, FR-03, FR-04)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- 진행 중 CropCycle의 `completed` 또는 `cancelled` 전환 Route Handler
- 종료 시 서버 UTC `endedAt`을 기록하고 terminal 상태를 보존하는 DB trigger
- 종료 작기 작업 계획 생성 API·UI 차단
- 모바일 상태 UI, 계약 문서, 도메인 문서, 테스트 갱신

## Out of Scope

- 종료 CropCycle 재활성화, 삭제
- 기존 FarmTask 취소·변경, ActionLog·IssueRecord·Attachment 수정·삭제
- FarmMembership 초대·역할 관리, 새 테이블·migration, Weather/AI/Disease/Sensor/Market

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Restricted Files

- 기존 migration 수정 금지. 새 lifecycle migration은 terminal 상태와 종료 시각을 DB에서 보장하는 최소 변경이다.
- RLS 우회, Service Role 사용, 작물·품종별 Core 분기 금지

## Input

- 로그인 Supabase 세션
- 접근 가능한 active CropCycle ID
- `completed` 또는 `cancelled` 상태

## Output

- `endedAt`이 기록된 terminal CropCycle
- 종료 작기의 계획 생성 409 거부

## Acceptance Criteria

- [x] 접근 가능한 active CropCycle을 완료 또는 취소할 수 있다.
- [x] 종료 시 서버 UTC 종료 시각을 기록한다.
- [x] 이미 종료했거나 접근할 수 없는 CropCycle은 변경하지 않는다.
- [x] 종료 작기에는 새 FarmTask 계획을 생성하지 않는다.
- [x] 기존 일정·결과·문제·사진·이력은 변경하거나 삭제하지 않는다.
- [x] 기존 Schema·RLS를 재사용하고 terminal 상태 보존을 위한 최소 migration만 추가한다.

## Required Tests

- [x] terminal 상태 입력 검증
- [x] 정상 종료, 접근 불가 거부, 중복 종료 거부
- [x] 종료 작기의 작업 계획 생성 거부
- [x] terminal 상태와 종료 시각을 보존하는 DB trigger migration
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 기능이며 Crop Pack 또는 Lab이 아니다.
- Route Handler와 Supabase RLS가 같은 로그인 사용자의 FarmMembership를 확인한다.
- 종료는 농업 처방, 진단, 자동 제어 또는 기존 작업·이력 삭제가 아니다.
- Crop 이름·품종·Fixture에 따른 분기가 없다.

## Handoff

- `202608140001_core_v01_crop_cycle_lifecycle.sql`을 Supabase SQL Editor에서 새 Query로 한 번 실행한다.
- CropCycle 재활성화와 FarmMembership 관리는 제품 정책 결정 후 별도 Task로 분리한다.
