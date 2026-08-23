# TASK-033 — Today-first 시니어 친화 UX Foundation

- GitHub Issue: #43
- 상태: Ready for review
- 제품 기준: `docs/PRD_PLATFORM_V0.2.md`, `docs/UX_GUIDELINES.md`

## 목표

기존 Farm, CropCycle, FarmTask, ActionLog, IssueRecord 흐름과 API를 변경하지 않고, 로그인 후 첫 화면에서 오늘의 작업을 가장 먼저 확인할 수 있게 한다.

## 범위

- Today 요약: 오늘 작업, 늦어진 작업, 확인이 필요한 현장 기록
- 늦어진 작업과 높은 우선순위를 먼저 보여 주는 3개 작업 요약
- `오늘 / 작업 계획 / 기록 / 농장` 하단 빠른 이동 메뉴
- 사용자 중심 용어로 헤더와 핵심 섹션 정리
- Today 요약 로직의 단위 테스트

## 제외

- FarmArea, Observation, Measurement 및 DB migration
- 기상청·농사로·KAMIS API와 키 설정
- 실제 값 없이 날씨·병해충·시세 카드만 표시하는 UI
- 기존 작업 생성, 결과 기록, 문제 기록 API의 변경

## 완료 조건

1. 선택된 Farm과 작기가 있으면 Today 요약이 설정·달력보다 먼저 보인다.
2. 오늘/지연 작업과 현장 기록이 실제 저장 데이터로만 표시된다.
3. 주요 메뉴가 해당 섹션으로 이동한다.
4. lint, typecheck, test, build가 성공한다.
