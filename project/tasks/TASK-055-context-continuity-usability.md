# TASK-055 — 초보자 친화적 작업 맥락 이어보기

- GitHub Issue: #87
- Status: In review

## Goal

현재 탭에서 선택한 농장과 작기를 새로고침 후에도 안전하게 이어 보고, 사용자 문구와 조작 크기를 초보자·고령자도 쉽게 이해할 수 있게 정리한다.

## References

- `docs/PRD_PLATFORM_V0.2.md`
- `docs/UX_GUIDELINES.md`
- `AGENTS.md`
- GitHub Issue #87

## Scope

- 로그인 사용자별 browser session storage에 Farm/CropCycle 식별자만 저장한다.
- 복원 대상이 목록 또는 권한 범위에 없으면 저장값을 지우고 선택 화면으로 안전하게 돌아간다.
- 새 농장·새 작기·선택 변경·로그아웃 때 저장 맥락을 일관되게 갱신한다.
- 내부 용어를 사용자용 한국어로 바꾸고, 보조 버튼·요약 텍스트를 더 크게 만든다.

## Out of Scope

- DB migration, RLS/API 변경, 영구 사용자 환경설정, 자동 농장 선택
- 기존 테스트용 농장 데이터의 삭제·변경

## Acceptance Criteria

- [ ] 선택한 농장과 작기는 같은 탭을 새로고침한 뒤 다시 열린다.
- [x] 다른 사용자나 권한 밖의 저장값을 사용하지 않는다.
- [x] 저장값이 오래돼도 오류 대신 농장/작기 선택 화면을 보여 준다.
- [x] 주요 화면의 사용자 문구에 `Farm`, `CropCycle`, `Today`, `Draft Template`이 남지 않는다.
- [x] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`가 통과한다.

## Security and Domain Safety

- session storage는 현재 브라우저 탭에만 남고, API key·정확한 위치·작업 기록·외부 데이터는 저장하지 않는다.
- 복원 전에도 기존 목록/API/RLS 결과로 Farm과 CropCycle 접근 권한을 다시 확인한다.
- Core Domain, Crop Pack, 외부 정보 Provider 동작과 농업 규칙을 바꾸지 않는다.

## Handoff

- Supabase SQL Editor와 Vercel 환경변수 변경은 필요 없다.
- 실제 사용자 로그인 상태에서 새로고침 후 Today로 돌아오는 Pilot 확인이 필요하다.
