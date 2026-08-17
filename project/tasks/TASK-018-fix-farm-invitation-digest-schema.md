# TASK-018: Farm 초대 토큰 해시 스키마 수정

## Goal

Farm 초대 링크를 생성하고 수락할 때 토큰 해시가 Supabase에서 정상적으로 처리된다.

## Background

Farm 초대 RPC는 security-definer 함수의 `search_path`를 `public`으로 고정한다. Supabase의 `pgcrypto` 확장은 `extensions` 스키마에 있어, unqualified `digest` 호출이 런타임에 해석되지 않았다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-017-fix-farm-invitation-email-ambiguity.md`

## Scope

- `create_farm_invitation`과 `accept_farm_invitation`에서 `extensions.digest`를 명시한다.
- 수정 migration, Data Dictionary, Task를 추가한다.

## Out of Scope

- 토큰 형식·해시 알고리즘 변경
- 자동 이메일 발송 서비스 연동
- 초대 API 응답, 역할 규칙, RLS, 테이블 구조 변경

## Allowed Files

- `supabase/migrations/202608170003_fix_farm_invitation_digest_schema.sql`
- `docs/DATA_DICTIONARY.md`
- `project/tasks/TASK-018-fix-farm-invitation-digest-schema.md`

## Acceptance Criteria

- [ ] 유효한 이메일로 초대 링크 생성 RPC가 성공한다.
- [ ] 생성된 링크가 같은 이메일의 로그인 사용자에게 수락된다.
- [ ] 원문 토큰은 계속 DB에 저장되지 않고 SHA-256 해시만 저장된다.
- [ ] migration 실행 중 `extensions.digest`를 확인한다.
- [ ] 기존 역할 규칙 및 RLS가 유지된다.

## Required Tests

- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build
- [ ] Supabase SQL Editor에서 migration 적용 후 초대 생성·수락 수동 검증

## Security and Domain Safety

토큰 형식과 SHA-256 해시 방식은 유지한다. `search_path`를 넓히지 않고 필요한 확장 함수를 스키마로 명시해 security-definer 함수의 기존 보안 경계를 유지한다. Service Role Key 또는 RLS 우회는 사용하지 않는다.

## Handoff

- DB migration 적용이 필요하다.
- API JSON, Domain Type, RLS 계약에는 변경이 없다.
- 자동 이메일 발송은 별도 외부 이메일 서비스 결정과 Task가 필요하다.
