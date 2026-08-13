# TASK-004: Core v0.1 사진 첨부

## Goal

사용자가 결과 기록(ActionLog) 또는 문제 기록(IssueRecord)에 선택적 사진을 붙이고, 권한 있는 Farm의 이력에서 이를 확인할 수 있게 한다.

## Background

TASK-001~003으로 Farm부터 결과·문제·재확인·이력까지의 P0 Work Cycle을 구현했다. PRD P1의 사진 첨부를 기존 `Attachment` 도메인과 Supabase Storage로 최소 구현한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md` (P1 사진 첨부, 화면 기록·이력, 데이터 무결성)
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- `attachments` metadata table과 비공개 `farm-attachments` Supabase Storage bucket
- FarmMembership 기반 Attachment·Storage RLS
- ActionLog 및 IssueRecord 대상의 별도 `multipart/form-data` 업로드 API
- JPEG/PNG/WebP, 10MB 제한, MIME type과 파일 헤더 검증
- 결과/문제 기록 뒤의 선택적 모바일 사진 첨부 UI와 History thumbnail
- 구현 계약과 자동 테스트

## Out of Scope

- 사진 편집, 삭제, EXIF 위치·촬영시각 수집, 다중 파일 일괄 업로드
- 이미지 AI 분석, 질병 판정, 농업 처방, 자동 제어
- Weather, AI, Disease, Sensor, Market

## Acceptance Criteria

- [ ] Attachment는 ActionLog 또는 IssueRecord 중 정확히 하나에 연결된다.
- [ ] 권한 없는 사용자는 Attachment metadata나 Storage object를 읽거나 쓸 수 없다.
- [ ] JPEG/PNG/WebP 10MB 이하 이미지만 업로드된다.
- [ ] 사진 업로드 실패가 이미 저장된 ActionLog·IssueRecord를 취소하지 않는다.
- [ ] 이력은 접근 가능한 Attachment를 한시적 서명 URL로 표시한다.

## Required Tests

- [ ] 파일 형식·시그니처 검증
- [ ] ActionLog Attachment API의 Storage 및 metadata 연결
- [ ] IssueRecord Attachment API의 연결과 ActionLog 경로 사용
- [ ] History Attachment 서명 URL 포함
- [ ] lint, typecheck, test, build

## Security and Domain Safety

- Storage bucket은 public으로 열지 않는다.
- Server는 사용자 Supabase 세션으로 요청하며 Service Role을 사용하지 않는다.
- 사진은 사용자 기록의 증거 자료일 뿐 농업 진단·처방이 아니다.
- Core 로직은 작물 이름으로 분기하지 않는다.

## Handoff

- Supabase Dashboard SQL Editor에서 `202608120004_core_v01_attachments.sql`을 새 쿼리로 적용해야 실제 업로드가 활성화된다.
- 다음 P1 후보는 `CropCycle.current growth stage` 변경이며, Crop Pack 생육 단계의 표현 계약을 먼저 검토한다.
