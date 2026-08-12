# Core Platform v0.1 PRD

**Status: CURRENT DEVELOPMENT SCOPE**

**Product baseline: [PRODUCT_PLAN.md](PRODUCT_PLAN.md)**

## 1. 목적

이 문서는 Core Platform v0.1에서 개발자가 무엇을 만들고 무엇을 만들지 않아야 하는지를 정의합니다. 서비스 기획을 새로 만드는 문서가 아니라 현재 제품 방향을 구현 가능한 범위로 고정하는 문서입니다.

## 2. Product Goal

사용자가 Farm과 CropCycle을 등록하면 Crop Pack 데이터를 기반으로 작기 전체의 작업을 계획하고, Today에서 오늘·지연 작업을 실행·기록하며, 문제 발생 시 후속 작업과 이력으로 연결할 수 있어야 합니다.

```text
Farm → CropCycle → 작업계획 → 전체 일정 → Today → 결과 기록
     → IssueRecord → Follow-up FarmTask → History
```

## 3. Reference Crop

초기 Fixture와 사용자 검증에는 Strawberry / Seolhyang / Protected cultivation을 사용합니다. 이는 Reference Crop일 뿐이며 Core DB Schema, API, 서비스 로직을 설향 전용으로 만들지 않습니다.

## 4. 제품 원칙

1. Core는 작물 독립적으로 구현한다.
2. Plan → Today → Execute → Record → Issue → Follow-up → History 전체 흐름을 우선 완성한다.
3. 농업 데이터가 미완성이어도 `draft` Fixture로 개발을 진행한다.
4. 검증되지 않은 농업정보를 검증된 처방처럼 표시하지 않는다.
5. 결과 기록은 현장에서 빠르게 수행할 수 있어야 한다.
6. 외부 API와 AI는 Core v0.1의 필수 의존성이 아니다.
7. 별도 FarmPlan Entity/Table은 현재 구조가 부족하다고 확인되기 전에는 만들지 않는다.

## 5. Main User Journey

| Step | User action | System result |
|---:|---|---|
| 1 | 농장 등록 | Farm 생성 |
| 2 | 작기 등록 | CropCycle 생성 |
| 3 | 작물·품종 선택 | 적용할 Crop Pack 데이터 결정 |
| 4 | 계획 생성 | 예정 FarmTask 생성 |
| 5 | 일정 확인 | 작기 전체 작업 표시 |
| 6 | Today 확인 | 오늘·지연·후속 작업 표시 |
| 7 | 결과 기록 | ActionLog 생성 및 FarmTask 상태 갱신 |
| 8 | 문제 기록 | IssueRecord 생성 |
| 9 | 재확인 등록 | 원본 IssueRecord를 참조하는 Follow-up FarmTask 생성 |
| 10 | 이력 조회 | 작업·문제·후속 관계 확인 |

## 6. P0 Functional Requirements

| ID | Requirement |
|---|---|
| FR-01 | 로그인 사용자가 Farm을 생성, 조회, 수정할 수 있다. |
| FR-02 | Farm에 CropCycle을 생성할 수 있다. 작물, 품종, 정식일을 기록한다. |
| FR-03 | Crop Pack의 TaskTemplate을 적용해 작기 전체의 예정 FarmTask를 생성할 수 있다. |
| FR-04 | 작기 전체 일정에서 예정·완료·문제·후속 작업을 확인할 수 있다. |
| FR-05 | Today에서 오늘 예정 및 지연된 FarmTask를 확인할 수 있다. |
| FR-06 | FarmTask 상세에서 작업 이유, 시기, 우선순위, 근거, 검증 상태를 확인할 수 있다. |
| FR-07 | 완료, 문제 있음, 확인하지 못함 결과를 ActionLog로 기록할 수 있다. |
| FR-08 | 문제 결과는 ActionLog와 연결된 IssueRecord를 생성할 수 있다. |
| FR-09 | 해결되지 않은 IssueRecord에서 Follow-up FarmTask를 만들고 원본 문제를 추적할 수 있다. |
| FR-10 | 작업 및 문제 이력을 발생순서와 후속 관계로 조회할 수 있다. |
| FR-11 | 모든 Mock/Fixture/초기 TaskTemplate은 검증 상태를 표시한다. |

### P1 (Core v0.1 완료를 막지 않음)

- 사진 첨부
- 현재 생육단계 변경

## 7. 초기 화면

| Screen | 표시·행동 |
|---|---|
| Today | 현재 Farm·CropCycle·생육단계, 오늘·지연·후속 작업, 결과 기록 진입 |
| 일정 | 작기 전체 FarmTask를 모바일 Timeline/List로 표시 |
| 기록 | 완료·문제 있음·확인하지 못함, 선택적 짧은 메모와 사진 |
| 이력 | 작업명, 수행 시각, 결과, 문제, 메모, 첨부, 후속 작업 |
| 설정 | Farm, CropCycle, 작물, 품종, 정식일 관리 |

## 8. Domain과 Crop Pack Contract

재사용 우선 도메인은 `Farm`, `CropCycle`, `TaskTemplate`, `FarmTask`, `ActionLog`, `IssueRecord`, `Attachment`입니다.

Crop Pack은 다음 정보를 데이터로 제공해야 합니다.

- `cropCode`, `cultivar`, `growthStage`
- `taskType`, `title`, `reason`, `timing`, `priority`
- `evidence`, `verificationStatus`

Core는 Crop Pack의 작물명으로 비즈니스 로직을 분기하지 않습니다. `TaskTemplate`은 기준 작업, `FarmTask`는 특정 Farm·CropCycle에 적용된 실제 예정·수행 작업입니다.

## 9. Verification Status와 Task Source

| Status | Meaning |
|---|---|
| `draft` | 개발·연구·Mock·Fixture |
| `evidence_checked` | 공식자료·논문 근거 확인 |
| `expert_reviewed` | 전문가 검토 |
| `field_validated` | 현장 검증 |

v0.1의 `source_type`은 `template`, `manual`, `issue_followup`을 우선 사용합니다. `weather_rule`, `sensor_rule`, `external`, `ai`는 향후 Lab 또는 Integration 후보이며 Core v0.1에 구현하지 않습니다.

## 10. Acceptance Criteria

| ID | Criteria |
|---|---|
| AC-01 | 필수 Farm 정보를 입력하면 저장 후 다시 조회할 수 있다. |
| AC-02 | Farm이 있을 때 작물·품종·정식일로 CropCycle을 생성할 수 있다. |
| AC-03 | 유효한 CropCycle과 Crop Pack Fixture로 초기 계획 생성 시 예정 FarmTask가 생성된다. |
| AC-04 | 작기의 FarmTask를 예정·완료·문제·후속 상태로 구분해 확인할 수 있다. |
| AC-05 | Today에서 오늘 예정 또는 지연된 FarmTask를 확인할 수 있다. |
| AC-06 | 완료 결과를 기록하면 ActionLog가 생성되고 FarmTask 상태가 갱신된다. |
| AC-07 | 문제 결과를 기록하면 ActionLog와 IssueRecord가 연결되어 저장된다. |
| AC-08 | IssueRecord에서 새 Follow-up FarmTask를 만들고 원본 문제를 추적할 수 있다. |
| AC-09 | 이력에서 ActionLog, IssueRecord, 후속 작업의 순서와 관계를 확인할 수 있다. |
| AC-10 | 가상의 다른 Crop Pack Fixture를 사용해도 Core DB Schema 변경 없이 계획과 작업 생성을 수행할 수 있다. |

## 11. Non-functional Requirements

- UI: Mobile First
- DB/Auth/Storage: Supabase PostgreSQL, Supabase Auth, Supabase Storage
- Deployment: Vercel
- DB: `snake_case`; TypeScript/API: `camelCase`
- DB 시간: UTC; UI 표시: Asia/Seoul
- Security: RLS 적용, Secret의 Client 노출 금지
- History: 실행 기록을 보존하고 사용자가 재시도 가능한 오류 상태를 제공

## 12. 데이터 무결성

```text
Farm → CropCycle → FarmTask → ActionLog
                       └────→ IssueRecord → Follow-up FarmTask
```

- IssueRecord는 원본 FarmTask를 참조합니다.
- Follow-up FarmTask는 원본 IssueRecord를 추적합니다.
- Attachment는 ActionLog 또는 IssueRecord에 연결합니다.
- 실제 스키마가 필요해질 때 migration과 `DATA_DICTIONARY.md`를 함께 갱신합니다.

## 13. Out of Scope

- Weather, Disease, Market API; Sensor 연동
- AI Chatbot, LLM 기반 농업 판단, 자동 진단, 농약 추천
- 자동 관수, 양액, 환기, 시설 제어
- 지원사업·교육 정보, 복잡한 Analytics Dashboard
- 실제 여러 Crop Pack 동시 운영
- 미래 기능 전용 인프라 또는 새 Framework

## 14. Fixture와 Test Scenario

모든 초기 농업 데이터는 `draft`로 표시할 수 있어야 합니다. 전문가 검토 전 Fixture는 실제 권고로 노출하지 않습니다.

| Scenario | Flow |
|---|---|
| Happy Path | Farm → CropCycle → TaskTemplate 적용 → FarmTask → Today → 완료 기록 → 이력 |
| Problem Path | Today → 문제 있음 → 메모 → IssueRecord → Follow-up FarmTask → 재확인 → 이력 |
| Crop Independence | 가상의 `test_crop` Fixture로 Core Schema 변경 없이 작업 생성 |

## 15. Definition of Done

- Happy Path와 Problem Path가 동작한다.
- migration과 Seed/Fixture가 재현 가능하다.
- 핵심 Domain 테스트, lint, typecheck, test, build, CI가 통과한다.
- Preview 배포와 README 실행 문서가 준비된다.
- 설향 전용 Core Logic이 없다.
- 검증되지 않은 농업정보와 외부 기능이 Core v0.1에 섞이지 않는다.

## 16. v0.1 이후

Core 완료 후 사용자 검증 결과를 바탕으로 Core v0.2 개선과 Weather, Disease, Analytics, AI, Sensor, Market, Additional Crop Pack Labs를 독립적으로 재평가합니다. 어느 Lab도 자동으로 Core 범위가 되지 않습니다.
