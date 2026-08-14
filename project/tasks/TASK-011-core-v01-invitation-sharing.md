# TASK-011: Core v0.1 초대 링크 전달 UX

## Goal

Farm owner 또는 admin이 생성한 직접 전달용 초대 링크를 모바일과 데스크톱에서 바로 공유하거나 복사할 수 있게 한다.

## Background

Farm 초대는 수신자 이메일을 확인하는 보안 규칙을 유지하면서 링크를 직접 전달하는 방식이다. 링크가 생성된 뒤의 다음 행동을 화면에서 분명히 보여 주고, 지원되는 기기에서는 운영체제의 기본 공유 기능을 사용할 수 있어야 한다.

## References

- `README.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-010-core-v01-farm-memberships.md`

## Scope

- 생성 직후 초대 링크 준비 상태와 전달 방법을 표시
- 지원되는 브라우저에서 Web Share API로 링크 공유
- 공유 API가 없는 환경 또는 공유 실패 시 기존 복사 기능 사용

## Out of Scope

- 자동 이메일, SMTP, 외부 메시지 서비스
- 초대 URL 또는 DB schema·RLS·API 계약 변경
- Farm 역할 정책 변경

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/app/styles.css`
- `apps/web/src/lib/invitation-sharing.ts`
- `apps/web/src/lib/invitation-sharing.test.ts`
- `project/tasks/**`

## Acceptance Criteria

- [x] 초대 링크 생성 뒤 전달 방법이 화면에 명확히 표시된다.
- [x] Web Share API 지원 환경에서 링크, 제목, 안내문을 공유한다.
- [x] 지원하지 않는 환경에서는 기존 복사 기능으로 자연스럽게 대체된다.
- [x] 자동 이메일이 발송된다는 오해를 만들지 않는다.

## Required Tests

- [ ] 초대 링크 생성·공유·복사 manual evidence
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 개선이며 Crop-specific Core hardcoding이 없다.
- 초대 토큰은 기존과 같이 응답과 현재 화면에만 존재하며 DB에 원문으로 저장하지 않는다.
- 새 외부 서비스, secret, RLS 우회 또는 Fixture 변경이 없다.

## Handoff

- DB migration과 계약 변경은 없다.
- 실제 초대 수락은 초대 이메일과 같은 계정으로 링크를 열어 별도로 확인한다.
