# DEVELOPMENT_ROADMAP.md

## Stage 0. 개발 계약과 저장소 기반

목표: 팀과 LLM이 동일한 기준으로 작업할 수 있게 합니다.

산출물:

- 제품·도메인·아키텍처·데이터·API 문서
- AGENTS.md
- Task·Issue·PR 템플릿
- 초기 Monorepo 골격
- CI 기본 설정

완료 기준:

- 팀 리더와 기술 통합 책임자가 문서 검토
- 다른 팀원이 실행 방법을 이해할 수 있음

## Stage 1. 첫 수직 기능

목표: 농장 등록부터 작업 이력까지 실제 연결합니다.

개발:

- Auth·권한 기본
- Farm·CropCycle
- TaskTemplate
- FarmTask 생성
- 오늘 화면
- ActionLog
- IssueRecord
- 사진·메모
- 후속 작업
- 이력

완료 기준:

- E2E 흐름 작동
- 필수 테스트·CI·Preview 배포

## Stage 2. 외부 날씨

목표: 지역 기반 날씨를 작업 근거로 사용합니다.

개발:

- 데이터원 검토
- WeatherAdapter
- 캐시
- 갱신일·출처 표시
- 외부 실패 fallback

## Stage 3. 공식 재배정보

목표: 설향 생육단계와 공식 재배자료를 연결합니다.

개발:

- FarmingGuideAdapter
- 생육단계 매핑
- 공식정보 표시
- FarmTask 근거 연결

## Stage 4. Mission Card 강화

목표: FarmTask UI에 이유·시간·근거·위험·결과 구조를 강화합니다.

## Stage 5. 병해충 정보

병명 확정이 아니라 발생환경 비교와 현장 확인 작업을 제공합니다.

## Stage 6. 기록 요약 AI

기록 요약, 누락 질문, 확인 작업 제안을 안전 기준과 함께 적용합니다.

## Stage 7. 센서·가격·기타 확장

현장 수요와 데이터 확보 가능성이 확인된 기능만 순차 적용합니다.
