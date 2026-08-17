# TASK-012: Core v0.1 초대 이메일 작성 UX

## Goal

Farm owner 또는 admin이 초대 링크 생성 직후 기본 이메일 앱에서 수신자와 초대 메시지가 채워진 메일을 작성할 수 있게 한다.

## Background

Core v0.1 Farm 초대는 링크를 직접 전달하며 자동 이메일 서비스를 사용하지 않는다. 모바일 공유와 복사에 더해, 사용자가 일반 이메일로 링크를 보낼 수 있는 명확한 방법이 필요하다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-011-core-v01-invitation-sharing.md`

## Scope

- 최신 초대의 수신 이메일을 현재 화면 상태에만 보관
- 기본 메일 앱을 여는 `mailto:` 초안 URL 생성
- 수신자, Farm 이름, 로그인 안내, 초대 링크, 7일 만료 안내를 메일 초안에 포함

## Out of Scope

- 자동 이메일 발송, SMTP, 외부 이메일 서비스 또는 Service Role Key
- DB migration, FarmInvitation API, RLS, 역할 정책 변경
- 초대 토큰의 DB 저장 또는 재노출

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/invitation-sharing.ts`
- `apps/web/src/lib/invitation-sharing.test.ts`
- `project/tasks/**`

## Input

- owner/admin이 만든 최신 Farm 초대의 응답 이메일과 초대 링크

## Output

- 수신자가 설정된 기본 이메일 앱의 작성 화면. 실제 발송은 사용자가 이메일 앱에서 결정한다.

## Acceptance Criteria

- [x] 초대 링크가 생성된 직후 이메일 앱 버튼을 표시한다.
- [x] 메일 초안에 수신자, Farm 이름, 동일 이메일 로그인 안내와 초대 링크를 포함한다.
- [x] 메일 앱을 열기만 하며 자동 발송하지 않는다.
- [x] Farm을 바꾸거나 초대를 취소하면 이전 초대 이메일을 화면 상태에서 지운다.

## Required Tests

- [x] 메일 초안 URL unit test
- [ ] 기본 이메일 앱 manual evidence
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 사용성 개선이며 Crop-specific Core hardcoding이 없다.
- 기존 초대 응답의 토큰만 사용하며, 새 DB 저장·외부 API·secret·RLS 우회가 없다.
- 자동 이메일 발송으로 오해하지 않도록 화면과 메일 초안 모두 직접 발송 흐름으로 표시한다.

## Handoff

- DB migration과 계약 변경은 없다.
- 실제 사용 기기의 기본 이메일 앱 설정 여부에 따라 `mailto:` 동작이 달라질 수 있다.
