# TASK-013: Core v0.1 Farm 초대 링크 재발급

## Goal

Farm owner 또는 admin이 분실한 대기 중 초대 링크를 안전하게 재발급하고, 새 링크를 바로 공유할 수 있게 한다.

## Background

초대 토큰 원문은 DB에 저장하지 않으므로, 화면을 닫은 뒤 기존 링크를 다시 보여 줄 수 없다. 같은 Farm과 이메일의 새 초대를 만들면 기존 대기 초대를 취소하는 현재 RPC 동작을 명시적인 UI로 제공한다.

## References

- `README.md`
- `docs/PRODUCT_PLAN.md`
- `docs/PRD_CORE_V0.1.md`
- `AGENTS.md`
- `docs/DOMAIN_MODEL.md`
- `docs/DATA_DICTIONARY.md`
- `docs/API_CONTRACT.md`
- `project/tasks/TASK-010-core-v01-farm-memberships.md`

## Scope

- 대기 중인 Farm 초대 행에서 권한이 있는 사용자에게만 `새 링크 만들기`를 표시한다.
- 재발급 전 기존 링크가 무효화된다는 확인을 받는다.
- 기존 초대 생성 API를 사용해 새 링크를 만들고, 공유·복사·이메일 앱 전달 영역에 표시한다.

## Out of Scope

- 자동 이메일 발송, SMTP 또는 외부 이메일 서비스
- DB migration, API contract, RLS 또는 역할 정책 변경
- 초대 토큰 원문 저장 또는 과거 링크 복원

## Allowed Files

- `apps/web/src/app/page.tsx`
- `apps/web/src/lib/invitation-sharing.ts`
- `apps/web/src/lib/invitation-sharing.test.ts`
- `README.md`
- `project/tasks/**`

## Restricted Files

- `supabase/migrations/**`
- Supabase RLS 및 RPC SQL
- 환경 변수와 secret

## Input

- 현재 Farm의 대기 중 `FarmInvitation` 이메일과 역할

## Output

- 새 초대 링크와 갱신된 만료 시각을 가진 대기 초대
- 기존 링크가 무효화되었음을 알려 주는 화면 피드백

## Acceptance Criteria

- [x] owner는 admin/farmer 초대를 재발급할 수 있다.
- [x] admin은 farmer 초대만 재발급할 수 있다.
- [x] farmer는 재발급 UI를 볼 수 없다.
- [x] 재발급 전 기존 링크 무효화 안내와 확인을 제공한다.
- [x] 재발급된 링크는 같은 화면에서 공유·복사·이메일 앱 전달할 수 있다.

## Required Tests

- [x] 역할별 재발급 가능 여부 unit test
- [ ] owner/admin/farmer 권한별 UI manual evidence
- [ ] 실제 링크 재발급 및 이전 링크 거절 manual evidence
- [x] lint
- [x] typecheck
- [x] test
- [x] build

## Security and Domain Safety

- Core Platform 협업 UX 개선이며 Crop-specific Core hardcoding이 없다.
- 기존 role-checked invitation RPC만 호출하며, RLS를 우회하거나 secret을 사용하지 않는다.
- 토큰 원문은 생성 응답과 현재 화면 상태에만 존재하며 DB에 저장하지 않는다.
- Crop Pack, Lab 결과, Draft fixture와 무관하다.

## Handoff

- DB migration과 API/RLS 계약 변경은 없다.
- 기존 동일 Farm+이메일 재초대 시 이전 대기 초대를 취소하는 DB 규칙을 명시적으로 사용한다.
- 후속 검증: 새 링크 수락 성공 및 이전 링크 수락 거절을 서로 다른 사용자로 확인한다.
