# Domain Model

**Status: CURRENT IMPLEMENTATION CONTRACT**

## 1. 목적

이 문서는 농업 현장의 개념과 관계를 DB 테이블보다 먼저 정의합니다. 새 제품 방향은 기존 핵심 도메인을 최대한 보존하며, 문서상 개념 추가가 자동으로 새 Entity나 Table 추가를 뜻하지는 않습니다.

## 2. 상위 개념

```text
dreAmIng Smart Farm Platform
├── Core Platform: 작물 독립 농작업 실행관리
├── Crop Packs: 작물·품종별 농업지식 데이터
└── Labs: Core와 분리된 검증 실험
```

Core Platform의 Work Cycle은 다음과 같습니다.

```text
Farm → CropCycle → 작기 전체 작업계획 → Today → FarmTask
     → ActionLog → IssueRecord → Follow-up FarmTask → History
```

## 3. 핵심 객체

### User

서비스 사용자입니다. 인증 정보는 Supabase Auth가 관리합니다.

### Farm

사용자가 운영하거나 관리하는 농장 단위입니다. 권한 있는 Farm 구성원은 접근 가능한 Farm을 다시 선택해 하위 작기와 기록을 이어서 볼 수 있고, 이름, 지역 코드, 재배 환경, 재배 방식을 수정할 수 있습니다. 이 선택·수정은 하위 CropCycle·FarmTask·이력의 관계와 내용을 바꾸지 않습니다.

### FarmMembership

User와 Farm의 관계 및 접근 권한을 정의합니다. 기존 `owner`, `admin`, `farmer` 이름은 유지합니다. 이 Slice에서는 기존 Farm 운영 데이터 RLS를 바꾸지 않고 구성원 관리 권한만 구분합니다. owner는 admin·farmer 초대, 역할 변경, 제거를 할 수 있고 admin은 farmer 초대·제거만 할 수 있습니다. farmer는 구성원 관리를 할 수 없습니다.

### FarmInvitation

FarmMembership를 만들기 전의 대기 중 초대입니다. 이메일, 초대 역할(admin 또는 farmer), 만료 시각과 상태를 보관하며, 초대 링크의 원문 토큰은 저장하지 않고 SHA-256 해시만 보관합니다. 기존 사용자는 로그인하고 신규 사용자는 링크 안에서 본인 비밀번호로 Supabase Auth 계정을 설정한 뒤, 같은 이메일로만 수락할 수 있습니다. 수락은 FarmMembership 생성과 초대 상태 변경을 하나의 DB 트랜잭션으로 처리합니다. FarmInvitation이나 Core DB에는 비밀번호를 보관하지 않습니다.

### CropCycle

하나의 Farm에서 특정 작물을 정식한 시점부터 재배 종료까지 관리하는 작기입니다. 작기 전체 작업계획의 시간적 범위가 되며, 현재 생육 단계는 Crop Pack의 용어를 텍스트로 기록합니다. 진행 중 작기는 완료 또는 취소 상태로 종료할 수 있고, 종료 시각과 기존 일정·기록은 보존합니다. Core는 작물별 단계 목록을 하드코딩하지 않습니다.

### TaskTemplate

Crop Pack이 제공하는 기준 작업입니다. 작물, 품종, 생육단계, 작업 시기, 작업 이유, 근거, 검증 상태를 표현할 수 있어야 합니다.

### FarmTask

특정 Farm과 CropCycle에서 실제로 예정·수행하는 작업입니다. Today와 일정의 데이터 원본이며, 초기 Mission Card는 FarmTask의 UI 표현일 뿐 별도 핵심 객체가 아닙니다.

### ActionLog

사용자가 FarmTask를 확인하거나 실행한 결과의 이력입니다.

### IssueRecord

FarmTask 수행 중 사용자가 관찰한 문제 또는 이상 상황입니다. 농업적 확정 진단이 아닙니다.

### Attachment

ActionLog 또는 IssueRecord에 연결하는 사진 등 파일입니다.

## 4. Crop Pack과 Growth Stage

Crop Pack은 별도 DB Entity가 아니라, 기존 `TaskTemplate` 중심 구조로 우선 표현하는 제품 개념입니다.

| Information | Meaning |
|---|---|
| Crop / Variety | 적용 작물과 품종 |
| Growth Stage | 작업을 적용하는 생육 단계 |
| Task Template | 기준 작업 |
| Timing | 예정 시기 또는 조건 |
| Reason | 작업 이유 |
| Evidence | 공식자료·논문·검토 근거 |
| Verification Status | 데이터 검증 수준 |

Growth Stage 역시 Crop Pack의 의미 단위입니다. 현 단계에서 새 공통 테이블이나 설향 전용 enum을 만들지 않습니다.

## 5. Farm Plan

Farm Plan은 사용자가 이해하는 **작기 전체 작업계획**이라는 논리적 제품 개념입니다. 현재는 아래 관계로 표현할 수 있는지 먼저 확인합니다.

```text
CropCycle + TaskTemplate → Scheduled FarmTask[]
```

이 구조가 충분한 동안 `farm_plans` 테이블이나 새 Domain Entity를 추가하지 않습니다. 새 Entity가 필수라고 판단되면 코드 전에 이유, 대안, 영향, Core 개발 Blocking 여부를 보고합니다.

## 6. 관계

```text
User N ─ N Farm                     through FarmMembership
Farm 1 ─ N FarmInvitation            before a new FarmMembership is accepted
Farm 1 ─ N CropCycle
CropCycle 1 ─ N FarmTask             scheduled plan and actual work
TaskTemplate 1 ─ N FarmTask          when created from a template
FarmTask 1 ─ N ActionLog
FarmTask 1 ─ N IssueRecord
IssueRecord 0..1 ─ N Follow-up FarmTask
ActionLog 1 ─ N Attachment
IssueRecord 1 ─ N Attachment
```

## 7. 상태와 업무 규칙

### CropCycle 상태

```text
active → completed
active → cancelled
```

`completed`와 `cancelled`는 terminal 상태입니다. 종료 시점은 `ended_at`에 서버 UTC로 기록하며, Core v0.1에서는 재활성화하지 않습니다.

### FarmTask 상태

```text
pending → in_progress → completed
pending | in_progress → issue_reported
pending → cancelled
```

초기 상태 값은 `pending`, `in_progress`, `completed`, `issue_reported`, `cancelled`입니다.

### IssueRecord 상태

`open`, `needs_review`, `resolved`, `closed_without_action`

권한 있는 Farm 구성원은 상태를 변경할 수 있습니다. `resolved`로 변경한 시점만 `resolved_at`에 기록하며, `open`, `needs_review`, `closed_without_action`으로 변경하면 `resolved_at`은 비워집니다. 이 상태 변경은 관찰 내용·심각도 같은 원본 문제 기록을 수정하지 않습니다.

### 업무 규칙

1. 종료된 CropCycle에는 새 자동 작업을 생성하지 않으며, 기존 일정·결과·이력은 보존합니다.
2. TaskTemplate은 기준, FarmTask는 실제 작기 작업입니다.
3. FarmTask의 결과는 ActionLog로 남기고 현재 상태는 FarmTask가 보유합니다.
4. IssueRecord는 원본 FarmTask를 참조하며, Follow-up FarmTask는 원본 IssueRecord를 참조합니다.
5. Attachment는 ActionLog 또는 IssueRecord에 연결합니다.
6. Core 비즈니스 로직은 Crop 이름으로 분기하지 않습니다.
7. 검증되지 않은 농업 데이터는 `draft`로 표시하고, 실제 처방이나 자동 제어로 사용하지 않습니다.
8. FarmInvitation은 7일 뒤 만료되며, owner는 admin·farmer를, admin은 farmer만 초대할 수 있습니다. 역할 변경은 owner만 할 수 있고 owner 역할 이전·제거는 이 Slice 범위 밖입니다.

## 8. 검증 상태

| Status | Meaning |
|---|---|
| `draft` | 개발·연구·Mock·Fixture |
| `evidence_checked` | 공식자료 또는 논문 근거 확인 |
| `expert_reviewed` | 농업 전문가 검토 |
| `field_validated` | 현장 검증 |

## 9. 향후 Labs와 Integrations

Weather, Disease, Analytics, AI, Sensor, Market 및 추가 Crop Pack 실험은 Lab에서 독립적으로 검증합니다. DataSource, ExternalRawData, NormalizedContent, ApiCallLog 같은 외부정보 객체는 실제 Integration이 Core에 필요한 것으로 승인될 때만 도입합니다.
