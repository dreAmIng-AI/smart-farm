# Product Plan: dreAmIng Smart Farm Platform

**Status: CURRENT PRODUCT DIRECTION**

**Scope: Core Platform v0.1 development baseline**

## 1. 문제 정의

재배기술, 병해충, 기상, 시장가격, 교육·지원사업 정보는 여러 곳에 존재합니다. 그러나 현장에서는 작기 전체에 해야 할 일을 계획하고, 오늘 우선할 작업을 판단하고, 실제 결과와 문제를 기록해 다음 행동으로 연결하는 흐름이 분산되기 쉽습니다.

dreAmIng Smart Farm은 정보를 많이 모아 보여주는 포털이 아니라 이 실행 흐름을 연결하는 플랫폼을 만듭니다.

## 2. Target User 가설

- **Primary**: 작기별 작업관리가 필요한 시설재배 농장을 직접 운영하는 농업인
- **Secondary**: 농장 운영 상태를 확인하는 관리 담당자와 검토자

연령, 영농경력, 스마트팜 수준 등 세부 페르소나는 농가 인터뷰와 사용자 검증 후 조정합니다.

## 3. Product Vision

농업인이 작기 전체의 농작업을 계획하고, 오늘 해야 할 일을 실행·기록하며, 농장 상황의 변화와 문제가 다음 행동 및 이력으로 연결되는 농작업 실행관리 플랫폼을 만든다.

```text
Plan → Today → Execute → Record → Issue → Follow-up → History
```

## 4. 플랫폼 구조

```text
dreAmIng Smart Farm Platform
├── Core Platform
├── Crop Packs
└── Labs
```

### Core Platform

작물과 관계없이 공통으로 사용하는 농작업 실행관리 기반입니다.

```text
Farm → CropCycle → 작기 전체 작업계획 → Today → FarmTask 실행
     → ActionLog 기록 → IssueRecord → Follow-up FarmTask → History
```

Core는 특정 작물의 농업 규칙을 하드코딩하지 않습니다.

### Crop Packs

작물·품종별 농업지식을 Core와 분리해 관리하는 개념입니다. 기존 `TaskTemplate` 등의 구조로 표현할 수 있으면 우선 재사용하며, Crop Pack을 위해 새 DB 테이블이나 추상화 계층을 먼저 만들지 않습니다.

Crop Pack이 표현하는 정보는 다음과 같습니다.

- Crop, Variety, Growth Stage
- Task Template, Timing, Task Reason
- Evidence, Verification Status

### Labs

Core에 포함할 필요가 아직 검증되지 않은 기능을 독립적으로 실험합니다.

- Weather Lab, Disease Lab, Analytics Lab, AI Lab
- Sensor Lab, Market Lab, Additional Crop Pack experiments

Lab의 결과나 일정은 Core 개발을 멈추게 하지 않습니다.

## 5. Reference Crop

Core Platform v0.1의 첫 Reference Crop은 다음과 같습니다.

| Field | Value |
|---|---|
| Crop | Strawberry |
| Variety | Seolhyang |
| Cultivation | Protected cultivation |

설향은 제품 전체가 아니라 Core가 실제 농업 작업 데이터를 수용할 수 있는지 검증하는 첫 사례입니다. `if (crop === "strawberry")` 같은 Core 분기, 설향 전용 서비스, 설향 전용 Core 테이블은 만들지 않습니다.

## 6. 핵심 사용자 Work Cycle

사용자는 아래 질문에 순서대로 답할 수 있어야 합니다.

1. 이번 작기에 무엇을 해야 하는가?
2. 오늘 무엇을 해야 하는가?
3. 실제로 수행했는가?
4. 어떤 문제가 발생했는가?
5. 다음에는 무엇을 확인해야 하는가?
6. 이전에는 어떤 일이 있었는가?

문제 흐름에서는 Today의 FarmTask 결과와 메모·사진을 `IssueRecord`에 연결하고, 필요한 재확인 작업을 `Follow-up FarmTask`로 남깁니다.

## 7. Evidence와 Verification

농업 데이터와 작업 기준은 검증 상태를 명확히 표시합니다.

| Status | Meaning |
|---|---|
| `draft` | 개발·연구·Mock·Fixture 단계 |
| `evidence_checked` | 공식자료 또는 논문 근거 확인 |
| `expert_reviewed` | 농업 전문가 검토 |
| `field_validated` | 현장 검증 |

검증되지 않은 데이터는 실제 농업 처방처럼 표현하지 않습니다. Mock과 Fixture는 Core 개발을 중단하지 않기 위해 허용하지만 반드시 `draft`로 구분합니다.

## 8. AI 적용 원칙

AI는 Core v0.1의 필수 범위가 아닙니다. 향후 AI Lab에서 기록 요약, 누락 정보 질문, 반복 문제 설명, 다음 확인 작업 제안을 검토할 수 있습니다.

AI는 병명 확정, 농약 처방, 관수·양액 결정, 시설 자동제어, 근거 없는 FarmTask 생성에 사용하지 않습니다. 안전하고 검증된 결과만 Core 또는 공식 Integration으로 승격합니다.

## 9. 운영 방식

| Role | Responsibility |
|---|---|
| Core Owner | Core Platform의 기준과 지속적인 개발 |
| Contributor | Crop Pack, Lab, 특정 기능의 독립적 개발 |
| Reviewer | 농업·데이터·기술 전문영역 검토 |

Non-blocking Development를 원칙으로 합니다. Contributor 응답, 외부 데이터, Lab 실험이 지연되어도 승인된 Core 개발은 계속됩니다.

## 10. Core v0.1에서 하는 것

- Farm과 CropCycle 생성
- Crop Pack 기반 기본 작업계획 생성
- 작기 전체 일정 및 Today의 오늘·지연 작업 확인
- 작업 결과와 짧은 메모 기록
- IssueRecord와 후속 작업 연결
- 작업·문제 이력 확인

`Farm Plan`은 제품 개념입니다. `CropCycle + TaskTemplate → Scheduled FarmTask[]`로 충분하면 별도 `farm_plans` 테이블을 만들지 않습니다.

## 11. Core v0.1에서 하지 않는 것

- Weather, Disease, Market API와 Sensor 연동
- AI Chatbot, LLM 기반 농업 판단, 농업 AI 진단
- 농약 추천, 자동 관수·양액·시설 제어
- 복잡한 Analytics Dashboard, 전체 농장 ERP
- 여러 Crop Pack의 동시 실운영
- Microservice, Event Bus, Queue, Data Warehouse, AI Framework 등 미래 기능 전용 인프라

## 12. 검증 전략

문헌·공식자료 → 제품 가설 → Prototype → 농가 인터뷰 → 사용자 테스트 → 개선 → 실제 사용 데이터 순서로 검증합니다.

초기 검증 질문은 다음과 같습니다.

- 작기 전체 계획이 실제로 필요한가?
- Today의 작업이 현장에서 유용한가?
- 결과 기록에 부담이 없는가?
- 문제 발생 후 재확인 흐름이 필요한가?
- 다른 Crop Pack에도 Core 스키마를 바꾸지 않고 적용할 수 있는가?

## 13. 장기 방향

Core의 가치는 기능 개수가 아니라 Plan → Execute → Record → Learn → Next Action의 연결을 안정적으로 만드는 데 있습니다. 외부 데이터, AI, 센서, 병해충, 시장 정보는 이 흐름의 가치를 높이고 독립적으로 검증될 때만 단계적으로 도입합니다.
