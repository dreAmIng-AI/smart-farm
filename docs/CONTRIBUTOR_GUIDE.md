# Contributor Start Guide

**Status: CURRENT EXECUTION GUIDE**

이 문서는 팀원이 Core Platform에 기능이나 데이터를 추가할 때 사용하는 최소 작업 경로입니다. 목표는 새 구조를 먼저 만들지 않고, 이미 동작하는 `Farm → CropCycle → FarmTask → ActionLog / IssueRecord → History` 흐름을 안전하게 확장하는 것입니다.

## 1. 시작 전 확인 순서

아래 문서가 현재 기준입니다.

1. [README](../README.md)
2. [Product Plan](PRODUCT_PLAN.md)
3. [Core v0.1 PRD](PRD_CORE_V0.1.md)
4. [작업 규칙](../AGENTS.md)
5. 구현 계약: [Domain Model](DOMAIN_MODEL.md), [Architecture](ARCHITECTURE.md), [Data Dictionary](DATA_DICTIONARY.md), [API Contract](API_CONTRACT.md)
6. [Task 문서 템플릿](../project/tasks/TASK_TEMPLATE.md)

현재 Core v0.1은 Farm 생성부터 계획, Today, 결과·문제 기록, 재확인 작업, 이력까지 구현되어 있습니다. 새로운 기능은 이 흐름의 어느 지점에 연결되는지 먼저 설명해야 합니다.

## 2. 작업 영역 선택

| 작업 대상 | 넣을 내용 | 넣지 않을 내용 |
|---|---|---|
| Core Platform | Farm, CropCycle, FarmTask 실행 흐름, 권한, 공통 API와 UI | 작물별 농업 규칙, 외부 API의 원본 데이터 |
| Crop Pack | `TaskTemplate` 데이터, 생육 단계 용어, 작업 이유·근거·검증 상태 | `if (crop === "...")` 같은 Core 분기, 작물 전용 Core 테이블 |
| Lab | 날씨·병해충·AI·센서·시장 등의 독립 실험과 검증 결과 | Core의 필수 의존성, 검증 전 자동 처방·자동 제어 |
| Integration | 승인된 외부 시스템의 서버 측 연결 | 브라우저에서의 Secret/API key 직접 호출 |

판단이 애매하면 구현을 시작하기 전에 Task 문서에 `[DECISION REQUIRED]`로 적고 Core Owner에게 확인합니다. 새 테이블, RLS, 인증·역할, 공통 API 계약, 외부 서비스 도입은 항상 이 절차가 필요합니다.

## 3. 한 기능을 플랫폼에 탑재하는 절차

1. `project/tasks/TASK_TEMPLATE.md`를 복사해 한 가지 목표만 담은 Task 문서를 작성합니다.
2. 최신 `main`에서 `1 Issue = 1 Branch = 1 PR` 브랜치를 만듭니다.
3. 기존 도메인과 API 계약을 확인하고, 필요한 최소 파일만 수정합니다.
4. DB 변경이 있으면 새 migration을 추가합니다. 이미 병합된 migration은 수정하지 않습니다.
5. DB 변경에는 `DATA_DICTIONARY.md`, Domain Type, `API_CONTRACT.md`, 테스트를 함께 갱신합니다.
6. `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`를 실행합니다.
7. PR 본문에 사용자 흐름, 계약·DB 변경, Fixture 검증 상태, 테스트 결과, 남은 위험을 기록합니다.
8. GitHub Actions의 Core CI가 통과한 뒤 squash merge합니다.

Core CI는 PR과 `main` 병합 뒤에 같은 검사를 자동 실행합니다. 실제 Supabase URL이나 key는 CI와 PR 본문에 넣지 않습니다.

## 4. Crop Pack 데이터 기여

Crop Pack은 별도 런타임 서비스가 아니라 기존 `task_templates` 데이터의 표현 방식입니다. 새 작물·품종에 필요한 작업은 아래 필드를 사용합니다.

| 필드 | 의미 |
|---|---|
| `crop_code`, `cultivar` | 작물과 선택적 품종 식별자 |
| `growth_stage` | Crop Pack이 정의한 현재 단계 용어 |
| `task_type`, `title`, `reason` | Core가 표시·실행할 작업 문맥 |
| `timing.offsetDays` | `transplant_date` 기준 예정일 오프셋 |
| `priority`, `evidence`, `verification_status` | 우선순위, 근거, 검증 상태 |

새 Crop Pack Fixture 또는 Template 데이터는 새 migration의 `insert into public.task_templates ...`로 추가합니다. 모든 개발용 데이터는 `verification_status = 'draft'`로 표시하고, 실제 농업 처방이나 확정 진단처럼 표현하지 않습니다. 기존 `test_crop` Fixture를 변경하지 않고도 같은 Core 로직으로 계획 생성이 되어야 합니다.

TaskTemplate을 적용하면 기존 `generate_planned_farm_tasks`가 `FarmTask`를 만듭니다. 따라서 별도의 `FarmPlan` 테이블이나 작물별 서비스·분기를 추가하지 않습니다.

## 5. Lab과 Integration 기여

Lab은 Core와 병렬로 실험할 수 있지만 Core의 계획·Today·기록 흐름을 막으면 안 됩니다. 외부 API가 필요하면 서버 또는 Integration Layer에서만 호출하고, 브라우저 코드와 PR에 Secret을 넣지 않습니다.

Lab 결과를 Core 또는 Integration으로 승격하려면 다음을 Task에 적습니다.

- 사용자 가치와 연결할 Core Work Cycle 지점
- 데이터 출처, 라이선스, 갱신 주기와 실패 시 동작
- 농업 안전성 및 Reviewer 검증 상태
- 운영 비용과 유지보수 담당자
- 기존 Core 계약을 복잡하게 만들지 않는 최소 API·데이터 경계

Weather, Disease, Sensor, Market, AI/LLM, 자동 진단·추천·제어는 현재 Core v0.1 범위가 아닙니다.

## 6. 안전한 첫 기여 예시

- Draft TaskTemplate Fixture를 추가하고, 다른 `crop_code`에서도 FarmTask 생성 테스트를 보강한다.
- 기존 FarmTask 또는 History의 읽기 전용 정보를 API 계약과 함께 보강한다.
- 결과·문제·후속 작업에서 사용자가 이해하기 어려운 입력·오류 메시지를 작은 UI 개선으로 고친다.
- Lab에서 독립 데이터를 검증하고, 아직 Core에 연결하지 않는 실험 문서와 테스트를 추가한다.

아래 변경은 Core Owner의 명시적 결정 없이는 시작하지 않습니다.

- 새 공통 테이블, migration/RLS 정책, Auth·역할 모델 변경
- `Farm`, `CropCycle`, `TaskTemplate`, `FarmTask`, `ActionLog`, `IssueRecord`, `Attachment` 이름 변경
- 외부 API, 유료 서비스, Secret, 자동 제어 또는 농업 처방
- Microservice, Event Bus, Queue, Data Warehouse 같은 미래용 구조

## 7. PR 완료 체크리스트

- [ ] 한 Task·한 Branch·한 PR 범위를 지켰다.
- [ ] Core / Crop Pack / Lab 중 소속과 경계를 PR에 적었다.
- [ ] 작물명으로 Core 로직을 분기하지 않았다.
- [ ] Fixture·Mock 데이터의 `draft` 또는 검증 상태를 표시했다.
- [ ] RLS를 우회하지 않았고 Secret을 노출하지 않았다.
- [ ] DB 변경 시 migration, 계약 문서, 타입, 테스트를 같이 바꿨다.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`와 Core CI를 통과했다.

## 8. 팀 간 전달 형식

PR 설명에는 다음만 짧게 남기면 다음 팀원이 바로 이어받을 수 있습니다.

```text
영역: Core Platform / Crop Pack / Lab
사용자 흐름: Plan → Today → Execute → Record → Issue → Follow-up → History 중 연결 지점
변경: API, DB, UI, Fixture 중 실제 변경 항목
검증 상태: draft / evidence_checked / expert_reviewed / field_validated
테스트: 실행한 명령과 결과
결정 필요사항: 없으면 없음
다음 작업: 독립적으로 진행할 수 있는 한 가지 후속 Task
```

이 형식으로 작업하면 Crop Pack과 Lab의 개발 속도가 달라도 Core Platform은 계속 안정적으로 동작합니다.
