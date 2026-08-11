# AGENTS.md

이 문서는 dreAmIng Smart Farm Platform에서 작업하는 사람과 LLM의 공통 개발 기준입니다.

## 1. 작업 전 읽을 문서

작업 전에는 다음 순서로 읽습니다.

1. `README.md`
2. `docs/PRODUCT_PLAN.md`
3. `docs/PRD_CORE_V0.1.md`
4. `AGENTS.md`
5. 관련 구현 계약: `docs/DOMAIN_MODEL.md`, `docs/ARCHITECTURE.md`, `docs/DATA_DICTIONARY.md`, `docs/API_CONTRACT.md`
6. 관련 Issue와 `project/tasks/` Task 문서

과거 문서나 구두 요청만으로 범위를 넓히지 않습니다. 제품 방향, DB/도메인 대규모 변경, 새 인프라가 필요한 경우에는 `[DECISION REQUIRED]` 형식으로 보고합니다.

## 2. 제품 경계

```text
dreAmIng Smart Farm Platform
├── Core Platform
├── Crop Packs
├── Labs
└── Integrations
```

- **Core Platform**: Farm → CropCycle → 작업계획 → Today → FarmTask → ActionLog → IssueRecord → Follow-up FarmTask → History 흐름을 작물 독립적으로 제공합니다.
- **Crop Pack**: 작물·품종별 생육단계, TaskTemplate, Timing, Reason, Evidence, Verification Status를 데이터로 관리합니다.
- **Labs**: 날씨, 병해충, 분석, AI, 센서, 시장, 추가 Crop Pack을 독립적으로 검증합니다. Lab은 Core의 선행 조건이 아닙니다.
- **Integrations**: 실제 필요와 검증이 확인된 외부 시스템 연결입니다.

Core에 `if (crop === "strawberry")`, `strawberry_tasks`, `seolhyang_service` 같은 작물 전용 분기나 이름을 추가하지 않습니다. 설향은 첫 Reference Crop이며 제품 자체가 아닙니다.

## 3. 현재 개발 범위

Core Platform v0.1에서 구현하는 P0 흐름은 다음입니다.

```text
Farm 생성 → CropCycle 생성 → 작업계획 생성 → 전체 일정 → Today
→ 결과 기록 → IssueRecord → Follow-up FarmTask → History
```

다음은 Core v0.1의 필수 범위가 아닙니다.

- Weather/Disease/Market API, Sensor, AI Chatbot, LLM
- 농업 AI 진단, 농약 추천, 자동 관수·양액·시설 제어
- 복잡한 Analytics, Microservice, Event Bus, Queue, Data Warehouse, AI Framework
- 작물별 Core 하드코딩과 사용하지 않는 추상화 계층

`FarmPlan`은 논리적 제품 개념입니다. `CropCycle + TaskTemplate → Scheduled FarmTask[]`로 요구사항을 만족하는 동안 새 테이블을 만들지 않습니다.

## 4. 도메인 규칙

- 기존 핵심 도메인 `Farm`, `CropCycle`, `TaskTemplate`, `FarmTask`, `ActionLog`, `IssueRecord`, `Attachment`를 우선 재사용합니다.
- 이름이 더 좋아 보인다는 이유만으로 `ActionLog`나 `IssueRecord`를 rename하지 않습니다.
- `TaskTemplate`은 Crop Pack의 기준이고 `FarmTask`는 특정 농장·작기에서 실제로 수행할 작업입니다.
- `ActionLog`는 실행 이력, `IssueRecord`는 사용자가 관찰한 문제를 기록합니다. 문제는 확정 진단이 아닙니다.
- Follow-up FarmTask는 원본 IssueRecord를 추적할 수 있어야 합니다.
- 농업적 의미가 있는 규칙, 템플릿, 용어는 Reviewer의 검토가 필요합니다.

## 5. 검증 상태와 Fixture

농업 데이터는 아래 상태를 명확히 표시합니다.

- `draft`: 개발·연구·Mock·Fixture 단계
- `evidence_checked`: 공식자료 또는 논문 근거 확인
- `expert_reviewed`: 농업 전문가 검토
- `field_validated`: 현장 검증

Mock, Fixture, Draft Rule, Stub은 Core 개발을 멈추지 않기 위해 사용할 수 있습니다. 검증되지 않은 내용을 실제 농업 처방처럼 표시하거나 자동 실행으로 연결하지 않습니다.

## 6. 역할과 Non-blocking Development

- **Core Owner**: Core Platform의 기준과 지속적인 개발을 책임집니다.
- **Contributor**: Crop Pack, Lab 또는 승인된 기능을 독립적으로 개발합니다.
- **Reviewer**: 농업·데이터·기술 전문영역을 검토합니다.

Contributor의 응답, Lab 실험, 외부 API 확보가 늦어도 Core Owner는 승인된 Core 범위를 계속 진행합니다. Lab이 Core에 승격되려면 사용자 가치, 데이터 안정성, 농업 안전성, 운영 비용, 유지보수 책임, 검증 결과를 확인합니다.

## 7. 기술과 보안 규칙

- Next.js, TypeScript, Supabase PostgreSQL/Auth/Storage, Vercel, Monorepo 기준을 유지합니다.
- DB는 `snake_case`, TypeScript/API JSON은 `camelCase`를 사용합니다.
- DB DateTime은 UTC로 저장하고 UI에는 Asia/Seoul로 표시합니다.
- Supabase RLS를 적용하고 Secret·Service Role Key·API Key를 클라이언트, 코드, 로그, PR에 노출하지 않습니다.
- DB 변경은 migration과 구현 계약 문서 변경을 동반합니다.
- 외부 API는 서버 또는 Integration Layer에서만 호출합니다.

## 8. 작업과 PR 규칙

- `main`에 직접 push하지 않습니다.
- `1 Issue = 1 Branch = 1 PR`을 지킵니다.
- 관련 없는 리팩터링, 요청되지 않은 라이브러리·프레임워크 추가, 테스트 삭제·약화를 금지합니다.
- PRD에 없는 기능을 임의로 추가하지 않습니다.
- 위험도가 높은 변경(DB migration, API 계약, 인증·권한, 공통 패키지, 배포 설정, 농업 도메인 규칙)은 명시적으로 검토합니다.
- Merge는 Squash and merge를 사용합니다.

Task에는 Goal, Background, References, Scope, Out of Scope, Allowed/Restricted Files, Input, Output, Acceptance Criteria, Required Tests, Security and Domain Safety, Handoff를 포함합니다.

## 9. 완료 전 검증

프로젝트 스크립트가 준비되면 변경 범위에 맞춰 아래를 실행합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

문서 변경은 링크, 문서 상태, 용어와 Core/Crop Pack/Labs 경계를 검토합니다. 코드 변경은 추가로 migration 재현성, Fixture 상태, RLS, 핵심 Work Cycle을 확인합니다.

## 10. 작업 결과 보고

```text
변경 목적:
변경 파일:
구현 내용:
실행한 검증:
검증 결과:
계약 변경 여부:
남은 위험 또는 결정 필요 사항:
후속 Task:
```
