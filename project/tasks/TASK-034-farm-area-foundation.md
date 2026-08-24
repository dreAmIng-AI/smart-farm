# TASK-034 — FarmArea Foundation

- GitHub Issue: #45
- Status: Ready for review

## Goal

기존 Farm과 권한 모델을 유지하면서, Farm 아래에 단순한 재배 구역을 등록하고 조회한다.

## Background

`docs/PRD_PLATFORM_V0.2.md`의 FR-02와 Pilot AC-01을 위한 최소 확장이다. 지도, 상세 주소, GPS, 센서 또는 작물별 규칙은 필요하지 않다.

## References

- `docs/PRD_PLATFORM_V0.2.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `docs/UX_GUIDELINES.md`

## Scope

- `farm_areas` migration, indexes, RLS, manager-only create policy
- member read / owner·admin create API
- 농장 화면의 재배 구역 등록·목록 UI
- Domain, data dictionary, API, roadmap, README and tests update

## Out of Scope

- CropCycle/FarmTask와 FarmArea 연결
- Observation, Measurement, standalone Issue 또는 Observation 사진
- 지도, 주소, GPS, 센서, 외부 공공데이터
- FarmArea 수정·삭제 API/UI

## Allowed Files

- `supabase/migrations/202608240001_platform_v02_farm_areas.sql`
- `apps/web/src/app/api/farms/[farmId]/areas/`
- `apps/web/src/app/components/farm-area-panel.tsx`
- `apps/web/src/app/page.tsx`, `apps/web/src/app/styles.css`
- `apps/web/src/lib/api/validation*`
- 관련 `docs/`, `README.md`

## Input / Output

- Input: `{ name, description? }`
- Output: `{ id, name, description, createdAt, updatedAt }`

## Acceptance Criteria

1. Farm owner/admin은 접근 가능한 Farm에 이름 있는 재배 구역을 생성할 수 있다.
2. Farm 구성원은 같은 Farm의 재배 구역만 읽을 수 있다.
3. 중복된 같은 Farm 내 구역 이름은 DB unique constraint로 거부된다.
4. 기존 Farm, CropCycle, FarmTask, ActionLog, IssueRecord, Attachment에는 스키마 변경이 없다.

## Required Tests

- FarmArea 입력 유효성
- 접근 가능한 Farm 목록 조회
- manager 생성 성공
- RLS가 Farm을 숨길 때 생성·조회 차단
- `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`

## Security and Domain Safety

- 모든 테이블·API는 FarmMembership RLS를 따른다.
- create는 owner/admin으로 한정하고 RLS와 Route Handler를 함께 적용한다.
- 상세 주소·GPS·GIS를 저장하지 않는다.
- 재배 구역은 운영 문맥이며 농업 처방이나 진단을 만들지 않는다.

## Handoff

다음 Issue는 별도 migration과 API로 standalone Observation을 추가한다. FarmArea를 선택 문맥으로 사용하되, 기존 v0.1 IssueRecord와 Attachment 관계는 변경하지 않는다.
