# TASK-019: 초대 링크 내 팀원 계정 설정

## Goal

새 팀원이 Supabase Dashboard를 거치지 않고 Farm 초대 링크 안에서 본인 비밀번호로 계정을 설정하고 Farm에 참여한다.

## Background

기존 초대 링크는 이미 생성된 Supabase Auth 계정의 로그인과 수락만 지원했다. 이로 인해 Farm 관리자가 Dashboard에서 팀원 계정과 비밀번호를 별도로 다뤄야 했다.

## References

- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-018-fix-farm-invitation-digest-schema.md`

## Scope

- 초대 링크를 연 비로그인 사용자에게 이메일·비밀번호·비밀번호 확인 계정 설정 UI를 제공한다.
- 기존 계정 사용자는 같은 UI에서 로그인할 수 있다.
- 새 세션 또는 로그인 세션에서 기존 초대 수락 흐름을 그대로 실행한다.
- 계정 설정 검증, 계약 문서, 사용자 검증 가이드를 추가한다.

## Out of Scope

- 관리자에 의한 비밀번호 생성·열람·전달
- 비밀번호 재설정 UI
- 자동 초대 이메일 발송과 `mailto:` 동작 보완
- DB migration, RLS, 초대 API 응답 변경

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/lib/invitation-acceptance.ts`
- `apps/web/src/lib/invitation-acceptance.test.ts`
- `README.md`
- `docs/DOMAIN_MODEL.md`
- `docs/ARCHITECTURE.md`
- `docs/API_CONTRACT.md`
- `project/USER_VALIDATION_GUIDE.md`
- `project/tasks/TASK-019-farm-invitation-self-service-account-setup.md`

## Acceptance Criteria

- [ ] 새 사용자가 링크 안에서 초대받은 이메일과 8자 이상 비밀번호를 입력해 계정을 설정한다.
- [ ] 새 세션이 있으면 기존 초대 수락 API가 자동으로 실행된다.
- [ ] 기존 계정은 초대받은 이메일로 로그인해 같은 흐름을 완료한다.
- [ ] 비밀번호는 FarmInvitation, Core API, Core DB에 저장·반환되지 않는다.
- [ ] Supabase Email confirmation이 켜진 경우 인증 후 링크 재방문 안내를 제공한다.

## Required Tests

- [ ] unit: 계정 설정 이메일 정규화·비밀번호 길이·일치 검증
- [ ] lint
- [ ] typecheck
- [ ] test
- [ ] build
- [ ] manual: 신규 이메일 초대 → 링크 내 계정 설정 → Farm 자동 수락

## Security and Domain Safety

이 작업은 Core Platform의 FarmInvitation과 Supabase Auth 세션 연결만 다룬다. 비밀번호는 브라우저에서 Supabase Auth에 직접 전달하며, server Route Handler, Core DB, 로그, 문서 예시에 보관하지 않는다. Service Role Key 또는 RLS 우회는 사용하지 않는다.

## Handoff

- DB migration과 API JSON 변경은 없다.
- 자동 이메일 발송과 운영체제 메일 앱 연동은 별도 후속 작업이다.
