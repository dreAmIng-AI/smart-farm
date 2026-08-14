# TASK-010: Core v0.1 Farm 구성원 초대·역할 관리

## Goal

기존 `FarmMembership`를 유지하면서 Farm owner와 팀원이 이메일 기반 직접 초대 링크로 협업할 수 있게 한다.

## Background

현재 `farm_memberships`는 Farm 생성 시 owner를 만들고 모든 Farm 구성원에게 기존 운영 데이터 접근을 제공한다. 하지만 팀원을 안전하게 추가하거나 역할을 관리하는 UI·API·DB 규칙은 없었다. Supabase Auth 사용자 목록을 브라우저에 노출하거나 Service Role Key를 사용하는 방식은 허용하지 않는다.

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

- `farm_invitations`와 7일 만료 초대 링크
- owner/admin/farmer의 최소 구성원 관리 규칙
- 동일 이메일 로그인 확인 뒤 FarmMembership를 만드는 원자적 수락 RPC
- Farm 선택 화면의 모바일 우선 구성원·초대 UI
- API·DB·도메인 계약 문서와 Route Handler 테스트

## Out of Scope

- 자동 이메일 발송, SMTP 또는 외부 이메일 서비스
- owner 역할 이전, owner 제거, farmer의 자가 탈퇴
- 기존 Farm·CropCycle·FarmTask·ActionLog·IssueRecord·Attachment 운영 RLS의 역할별 세분화
- Weather, AI, Disease, Sensor, Market

## Allowed Files

- `apps/web/src/app/**`
- `apps/web/src/lib/api/**`
- `supabase/migrations/**`
- `docs/**`, `README.md`, `project/tasks/**`

## Acceptance Criteria

- [x] owner는 admin 또는 farmer의 초대 링크를 만들 수 있다.
- [x] admin은 farmer 초대 링크만 만들 수 있다.
- [x] 수신자는 동일 이메일로 로그인한 뒤 유효한 링크를 한 번 수락할 수 있다.
- [x] 초대 토큰 원문은 DB에 저장하지 않는다.
- [x] owner는 non-owner의 역할을 변경하고 제거할 수 있다.
- [x] admin은 farmer만 제거할 수 있다.
- [x] farmer는 구성원 이메일·초대 목록 또는 관리 동작을 받지 않는다.
- [x] 기존 Farm 운영 데이터 접근 규칙과 도메인 이름은 변경하지 않는다.

## Required Tests

- [x] 초대 입력 검증과 role-checked invitation RPC 호출
- [x] UUID 초대 토큰 수락과 잘못된 토큰 거부
- [x] 협업 조회와 잘못된 Farm ID 거부
- [x] 역할 변경·제거 RPC 호출
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Service Role Key, Auth 사용자 목록 직접 노출, RLS 우회 금지
- 초대 이메일은 대기 초대의 같은 이메일 수락 확인에만 최소 보관
- 구성원 이메일은 owner/admin 전용 security-definer RPC에서만 Auth로부터 조회
- 자동 이메일·AI·작물별 Core 분기 없음

## Handoff

- `202608140002_core_v01_farm_memberships.sql`을 이전 migration 적용 후 Supabase SQL Editor에서 새 Query로 한 번 실행한다.
- UI에서 owner 계정으로 초대 링크를 만들고, 별도 테스트 계정을 같은 이메일로 로그인한 뒤 링크를 열어 수락을 확인한다.
