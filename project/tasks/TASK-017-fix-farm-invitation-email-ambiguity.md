# TASK-017: Farm 초대 이메일 컬럼 모호성 수정

## Goal

유효한 이메일로 Farm 초대를 생성하거나 재발급하면 초대 링크가 정상 생성된다.

## Background

`create_farm_invitation`은 `RETURNS TABLE (..., email, ...)`를 사용한다. 따라서 기존 대기 초대를 취소하는 UPDATE 조건의 unqualified `email`이 반환 변수와 테이블 컬럼 중 무엇인지 PostgreSQL이 결정할 수 없어 오류가 발생했다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-016-fix-farm-invitation-email-validation.md`

## Scope

- `create_farm_invitation` RPC의 대기 초대 갱신 조건에서 테이블 컬럼을 명시한다.
- 수정 migration, Data Dictionary, Task를 추가한다.

## Out of Scope

- 자동 이메일 발송 서비스 연동
- 초대 API 응답, 역할 규칙, RLS, 테이블 구조 변경

## Allowed Files

- `supabase/migrations/202608170002_fix_farm_invitation_email_ambiguity.sql`
- `docs/DATA_DICTIONARY.md`
- `project/tasks/TASK-017-fix-farm-invitation-email-ambiguity.md`

## Acceptance Criteria

- [ ] 유효한 이메일로 초대 링크 생성 RPC가 성공한다.
- [ ] 같은 이메일의 기존 pending 초대가 취소되고 새 링크가 생성된다.
- [ ] 기존 owner/admin 권한 및 RLS가 유지된다.

## Required Tests

- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build
- [ ] Supabase SQL Editor에서 migration 적용 후 유효 이메일로 수동 초대 생성

## Security and Domain Safety

Core Platform의 Farm 협업 기능만 수정한다. 이메일은 기존처럼 정규화한 값만 대기 초대에 보관하며, 원문 초대 토큰을 DB에 저장하지 않는다. Service Role Key 또는 RLS 우회는 사용하지 않는다.

## Handoff

- DB migration 적용이 필요하다.
- API JSON, Domain Type, RLS 계약에는 변경이 없다.
- 자동 이메일 발송은 별도 외부 이메일 서비스 결정과 Task가 필요하다.
