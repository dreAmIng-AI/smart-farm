# TASK-001: Core v0.1 첫 Vertical Slice

## Goal

Farm 생성부터 Draft TaskTemplate 적용, 작기 전체 일정과 Today 조회까지를 하나의 작물 독립 흐름으로 구현한다.

## Background

저장소에는 제품·도메인·데이터·API 계약 문서만 있으며, 애플리케이션과 Supabase migration은 아직 없다. 첫 Slice는 Work Cycle의 계획과 조회 구간을 검증한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- Farm, FarmMembership, CropCycle, TaskTemplate, FarmTask migration과 RLS
- Draft Reference Crop Fixture
- Farm 생성, CropCycle 생성, TaskTemplate 기반 계획 생성, 일정·Today 조회 API
- Mobile First 최소 UI와 핵심 단위 테스트

## Out of Scope

- ActionLog, IssueRecord, Attachment, Follow-up FarmTask, History
- 로그인 UI, 실제 Supabase 프로젝트 연결, Preview 배포
- Weather, AI, Disease, Sensor, Market

## Allowed Files

- `apps/web/**`
- `supabase/migrations/**`
- workspace 설정 파일
- 구현 계약 문서와 이 Task 문서

## Restricted Files

- `farm_plans` 테이블 또는 작물 전용 Core 로직
- 후속 Slice 전용 도메인 테이블과 외부 Integration

## Input

인증된 사용자의 Farm 정보, CropCycle의 작물·품종·정식일, `draft` TaskTemplate Fixture.

## Output

작기 전체의 Scheduled FarmTask 목록과 Asia/Seoul 기준 Today의 오늘·지연 작업 목록.

## Acceptance Criteria

- [x] Farm과 owner FarmMembership가 생성된다.
- [x] Farm에 CropCycle을 생성할 수 있다.
- [x] Draft TaskTemplate이 Scheduled FarmTask로 적용된다.
- [x] 동일 템플릿·일정의 중복 계획 생성을 막는다.
- [x] 작기 전체 일정과 Today의 오늘·지연 작업을 조회한다.
- [x] 다른 Crop Fixture도 Core 로직 변경 없이 적용된다.

## Required Tests

- [x] Farm 입력 검증과 인증 실패 응답
- [x] CropCycle 입력 검증
- [x] 계획 생성·중복 방지·Crop Independence
- [x] Today의 없음·오늘·지연 구분
- [x] lint, typecheck, test, build

## Security and Domain Safety

- Core Platform 범위이며 RLS를 우회하지 않는다.
- Crop-specific Core hardcoding이 없다.
- 모든 개발 Template Fixture는 `draft`다.
- Lab과 외부 시스템은 Core의 선행 조건이 아니다.

## Handoff

변경 파일, 검증 결과, migration 적용 전제, 다음 Slice 범위를 PR에 기록한다.
