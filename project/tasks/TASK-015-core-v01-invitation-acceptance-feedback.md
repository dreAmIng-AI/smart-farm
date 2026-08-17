# TASK-015: Core v0.1 Farm 초대 수락 안정화

## Goal

Farm 초대 링크를 다른 계정으로 열어 수락에 실패해도 링크를 잃지 않고, 수락 성공 시 초대된 Farm을 바로 열 수 있게 한다.

## Background

초대 수락은 로그인 이메일과 초대 이메일이 일치해야 한다. 기존 화면은 성공·실패와 관계없이 URL의 초대 토큰을 지워, 잘못된 계정으로 열었을 때 올바른 계정으로 다시 시도하기 어려웠다. 또한 성공 뒤 Farm을 수동으로 다시 선택해야 했다.

## References

- `README.md`
- `docs/PRD_CORE_V0.1.md`
- `docs/DOMAIN_MODEL.md`
- `docs/API_CONTRACT.md`
- `AGENTS.md`
- `project/USER_VALIDATION_GUIDE.md`

## Scope

- 초대 수락 성공 후에만 URL에서 초대 토큰을 제거한다.
- 수락 실패 시 올바른 이메일로 다시 로그인해 같은 링크를 재시도하도록 안내한다.
- 수락 성공 시 해당 Farm의 CropCycle·Today·이력 컨텍스트를 바로 불러온다.
- 동시에 시작된 이전 Farm 목록 조회가 수락 뒤 목록을 덮어쓰지 않게 한다.

## Out of Scope

- DB migration, invitation RPC, RLS, 역할 정책 변경
- 자동 이메일 발송 또는 초대 토큰 원문 저장
- 화면 디자인·정보 구조 변경

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/lib/invitation-acceptance.ts`
- `apps/web/src/lib/invitation-acceptance.test.ts`
- `project/USER_VALIDATION_GUIDE.md`
- `project/tasks/**`

## Restricted Files

- `supabase/migrations/**`
- Supabase RLS 및 RPC SQL
- 환경 변수와 secret

## Input

- URL의 Farm invitation UUID 토큰과 로그인한 사용자 이메일

## Output

- 성공 시 토큰이 제거된 URL과 자동으로 열린 Farm 컨텍스트
- 실패 시 토큰이 보존된 URL과 재로그인·재시도 안내

## Acceptance Criteria

- [x] 초대 수락 성공 뒤에만 URL에서 `invite` 토큰을 제거한다.
- [x] 실패한 수락은 같은 링크를 다른 로그인 계정에서 다시 시도할 수 있다.
- [x] 성공한 수락은 해당 Farm의 CropCycle·Today·이력 데이터를 불러온다.
- [x] 기존 Farm 선택도 같은 컨텍스트 복원 함수를 사용한다.

## Required Tests

- [x] 수락 성공 뒤 URL 토큰 제거 unit test
- [ ] 다른 이메일 실패 후 올바른 이메일 재수락 manual evidence
- [ ] 수락 성공 후 Farm 자동 열기 manual evidence
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- 기존 role-checked DB RPC와 FarmMembership RLS를 그대로 사용한다.
- 토큰 원문은 URL과 수락 요청에만 존재하며 DB에 저장하지 않는다.
- Core Platform 동작 안정화이며 작물별 조건 또는 Lab 기능을 추가하지 않는다.

## Handoff

- DB/API/RLS 계약 변경이 없다.
- 사용자 검증 시 잘못된 이메일 계정과 올바른 이메일 계정의 수락 동작을 각각 확인한다.
