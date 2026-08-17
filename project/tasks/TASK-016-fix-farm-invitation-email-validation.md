# TASK-016: Farm 초대 이메일 검증 오류 수정

## Goal

유효한 이메일로 Farm 초대 링크를 생성하면 초대와 직접 전달용 링크가 정상 생성된다.

## Background

초대 생성 API와 브라우저 입력 검증은 유효한 이메일을 전달하지만, 적용된 PostgreSQL RPC의 정규식이 점(`.`)을 두 번 이스케이프해 모든 일반 이메일을 거부했다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`

## Scope

- `create_farm_invitation` RPC의 PostgreSQL 이메일 형식 검증을 교정한다.
- 빈 값과 320자 초과 이메일은 DB에서도 거부한다.
- 변경 migration과 Data Dictionary를 추가한다.

## Out of Scope

- 자동 이메일 발송 서비스 연동
- 초대 API 응답, 역할 규칙, RLS, 테이블 구조 변경

## Allowed Files

- `supabase/migrations/202608170001_fix_farm_invitation_email_validation.sql`
- `docs/DATA_DICTIONARY.md`
- `project/tasks/TASK-016-fix-farm-invitation-email-validation.md`

## Acceptance Criteria

- [ ] 유효한 이메일로 초대 링크 생성 RPC가 성공한다.
- [ ] 기존 owner/admin 초대 권한 및 admin의 farmer 전용 제한이 유지된다.
- [ ] 초대 링크·역할·만료 응답 계약과 RLS가 변경되지 않는다.

## Required Tests

- [ ] 기존 TypeScript 입력 검증 unit test
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build
- [ ] Supabase SQL Editor에서 migration 적용 후 유효 이메일로 수동 초대 생성

## Security and Domain Safety

Core Platform의 Farm 협업 기능만 수정한다. 이메일은 기존처럼 정규화한 값만 대기 초대에 보관하고, 원문 초대 토큰을 DB에 저장하지 않는다. Service Role Key 또는 RLS 우회는 사용하지 않는다.

## Handoff

- DB migration 적용이 필요하다.
- API JSON, Domain Type, RLS 계약에는 변경이 없다.
- 후속으로 자동 이메일 발송을 원하면 별도 외부 이메일 서비스 결정과 Task가 필요하다.
