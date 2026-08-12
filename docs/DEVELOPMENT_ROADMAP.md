# Development Roadmap

**Status: CURRENT EXECUTION ROADMAP**

이 로드맵은 외부 기능을 순차적으로 의무 구현하는 계획이 아닙니다. Core Track과 독립적인 Parallel Experiments를 구분합니다.

## CORE TRACK

### Core v0.1

목표: 한 농업인이 Plan → Today → Execute → Record → Issue → Follow-up → History Work Cycle을 완료할 수 있게 합니다.

- Farm, CropCycle
- TaskTemplate에서 계획된 FarmTask 생성
- 전체 일정과 Today
- ActionLog, IssueRecord, Follow-up FarmTask
- 작업·문제 이력
- RLS, migration, Fixture, 테스트, Preview 배포

완료 기준은 [PRD_CORE_V0.1.md](PRD_CORE_V0.1.md)의 Acceptance Criteria와 Definition of Done입니다.

### User Validation

목표: Prototype과 Reference Crop Fixture로 다음 가설을 검증합니다.

- 작기 전체 계획이 필요한가?
- Today의 작업이 현장에서 유용한가?
- 결과·문제 기록의 입력 부담이 적절한가?
- 후속 확인과 이력이 실제 의사결정에 도움이 되는가?

### Core v0.2

사용자 검증에서 확인된 흐름·입력·이력의 문제를 우선 개선합니다. Lab의 결과는 승격 기준을 통과했을 때만 검토합니다.

### Improvements

안정성, 사용성, 데이터 품질, 운영상의 개선을 작은 Issue와 PR로 진행합니다.

## PARALLEL EXPERIMENTS

다음은 독립 Lab입니다.

- Weather Lab
- Disease Lab
- Analytics Lab
- AI Lab
- Sensor Lab
- Market Lab
- Additional Crop Packs

Lab은 데이터를 탐색·검증할 수 있으나 Core v0.1의 필수 의존성이나 완료 조건이 아닙니다.

## Lab → Core / Integration 승격 기준

Lab 결과는 다음을 확인하기 전 Core 범위가 되지 않습니다.

1. 사용자 가치와 사용 시나리오
2. 데이터 안정성, 출처, 라이선스, 운영 가능성
3. 농업 안전성과 Reviewer 검토
4. 비용, 실패 처리, 유지보수 책임
5. Core Work Cycle을 복잡하게 만들지 않는 명확한 계약

## 현재 하지 않는 것

Weather/Disease/Market API, Sensor, AI Chatbot, LLM 기반 농업 판단, 자동 제어, 복잡한 Analytics, Microservice 등은 Core v0.1 구현에 포함하지 않습니다.
