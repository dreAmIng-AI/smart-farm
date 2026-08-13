# Data Dictionary

**Status: CURRENT IMPLEMENTATION CONTRACT**

**Note: 이 문서는 Core v0.1의 현재 구현 계약입니다. migration은 farms, farm_memberships, crop_cycles, task_templates, farm_tasks, action_logs와 issue_records를 구현합니다. Attachment은 실제 요구가 생길 때 migration과 함께 추가합니다.**

## 1. 공통 규칙

- Database: `snake_case`
- TypeScript/API JSON: `camelCase`
- 식별자: PostgreSQL UUID
- DateTime 저장: UTC (`timestamptz`)
- UI 표시: Asia/Seoul
- RLS 적용, 인증정보는 Supabase Auth가 관리
- Soft delete는 실제 요구가 확인된 객체에만 적용

## 2. 핵심 도메인과 관계

```text
Farm → CropCycle → FarmTask → ActionLog
                         └──→ IssueRecord → Follow-up FarmTask
ActionLog | IssueRecord → Attachment
TaskTemplate → FarmTask
```

`CropCycle + TaskTemplate → Scheduled FarmTask[]`가 작기 전체 작업계획을 표현합니다. 현재 `farm_plans` 테이블은 추가하지 않습니다.

## 3. 핵심 테이블 초안

### farms

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 농장 식별자 |
| name | text | Y | 농장명 |
| region_code | text | Y | 지역 식별값 |
| cultivation_environment | text | Y | facility, open_field 등 |
| cultivation_method | text | N | 재배방식 |
| created_at / updated_at | timestamptz | Y | 생성·수정 시각 |

### farm_memberships

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 관계 식별자 |
| farm_id | uuid | Y | Farm |
| user_id | uuid | Y | Supabase Auth 사용자 |
| role | text | Y | owner, farmer, admin |
| created_at | timestamptz | Y | 생성 시각 |

### crop_cycles

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 작기 식별자 |
| farm_id | uuid | Y | Farm |
| crop_code | text | Y | Crop Pack의 작물 코드 |
| cultivar | text | N | 품종 |
| transplant_date | date | Y | 정식일 |
| growth_stage | text | N | 현재 생육단계 |
| status | text | Y | active, completed, cancelled |
| ended_at | timestamptz | N | 종료 시각 |

### task_templates

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 템플릿 식별자 |
| crop_code | text | Y | 적용 작물 |
| cultivar | text | N | null이면 작물 공통 |
| growth_stage | text | N | 적용 생육단계 |
| task_type | text | Y | 작업 유형 |
| title | text | Y | 작업명 |
| reason | text | Y | 작업 이유 |
| timing | jsonb | N | 시기 또는 생성 조건 |
| priority | text | Y | low, medium, high |
| evidence | jsonb | N | 근거 목록 |
| verification_status | text | Y | 데이터 검증 상태 |
| version | integer | Y | 템플릿 버전 |

`task_templates`는 Crop Pack을 표현하는 기존 구조입니다. 별도 Crop Pack 테이블을 전제하지 않습니다.

### farm_tasks

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 작업 식별자 |
| farm_id | uuid | Y | Farm |
| crop_cycle_id | uuid | Y | CropCycle |
| task_template_id | uuid | N | 생성 근거 템플릿 |
| parent_issue_id | uuid | N | Follow-up의 원본 IssueRecord |
| title / task_type / reason | text | Y | 실제 작업 내용 |
| priority | text | Y | low, medium, high |
| scheduled_for | timestamptz | N | 계획된 시각 |
| due_at | timestamptz | N | 지연 판단 기준 시각 |
| evidence | jsonb | N | 적용된 근거 |
| verification_status | text | Y | 적용 데이터의 검증 상태 |
| source_type | text | Y | template, manual, issue_followup |
| status | text | Y | pending, in_progress, completed, issue_reported, cancelled |
| result_required | boolean | Y | 결과 기록 필요 여부 |
| created_at / completed_at | timestamptz | Y/N | 생성·완료 시각 |

### action_logs

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 실행 기록 식별자 |
| farm_task_id | uuid | Y | FarmTask |
| user_id | uuid | Y | 기록 사용자 |
| action_type | text | Y | viewed, started, completed, issue_reported, not_checked |
| result_code | text | N | 정상·문제·미확인 등 |
| note | text | N | 짧은 메모 |
| performed_at / created_at | timestamptz | Y | 현장 수행·저장 시각 |

`202608120002_core_v01_task_results.sql`은 ActionLog를 실제 테이블·RLS로 구현합니다. 현재 UI/API는 `completed`, `not_checked`만 기록합니다. 완료는 FarmTask를 `completed`로 갱신하고, 미확인은 상태를 유지해 Today에 남깁니다.

### issue_records

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 문제 식별자 |
| action_log_id | uuid | Y | 연결된 `issue_reported` ActionLog, 1:1 |
| farm_task_id | uuid | Y | 원본 FarmTask |
| crop_cycle_id | uuid | Y | CropCycle |
| observed_symptom | text | Y | 사용자가 관찰한 사실 |
| severity | text | Y | low, medium, high, unknown |
| status | text | Y | open, needs_review, resolved, closed_without_action |
| expert_review_required | boolean | Y | 전문가 확인 필요 여부 |
| created_at / resolved_at | timestamptz | Y/N | 생성·해결 시각 |

`202608120003_core_v01_issues.sql`은 IssueRecord, RLS와 원자적 문제 기록 RPC를 구현합니다. 문제 내용은 사용자가 관찰한 사실이며 확정 진단이나 처방이 아닙니다. `farm_tasks.parent_issue_id`는 IssueRecord를 참조하고, 같은 IssueRecord에 같은 예정일로 중복된 Follow-up FarmTask를 만들 수 없도록 제약합니다.

### attachments

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 파일 식별자 |
| action_log_id | uuid | N | ActionLog |
| issue_record_id | uuid | N | IssueRecord |
| storage_path | text | Y | Supabase Storage 경로 |
| mime_type / file_size_bytes | text / bigint | Y | 파일 형식·크기 |
| captured_at / created_at | timestamptz | N/Y | 촬영·업로드 시각 |

## 4. 검증 상태

| Value | Meaning |
|---|---|
| `draft` | 개발·연구·Mock·Fixture |
| `evidence_checked` | 공식자료 또는 논문 근거 확인 |
| `expert_reviewed` | 농업 전문가 검토 |
| `field_validated` | 현장 검증 |

초기 Fixture와 Mock은 `draft`입니다. 검증 상태는 농업 처방의 확정 여부를 의미하지 않으며, 화면에서도 명확히 구분합니다.

## 5. 범위 밖 데이터

`DataSource`, `ExternalRawData`, `NormalizedContent`, `ApiCallLog`, Sensor, Market, AI 관련 테이블은 현재 migration에 포함하지 않습니다. 해당 Lab 또는 Integration이 승인될 때 데이터 출처, 안전성, 라이선스, 운영 책임을 검토한 뒤 추가합니다.

## 6. PII

사용자 이메일 등 인증정보는 Supabase Auth를 따르며 애플리케이션 테이블에 불필요하게 복제하지 않습니다. Farm 데이터는 FarmMembership와 RLS로 보호합니다.
