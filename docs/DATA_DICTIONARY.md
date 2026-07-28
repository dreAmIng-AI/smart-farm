# DATA_DICTIONARY.md

## 1. 공통 규칙

- Database: `snake_case`
- TypeScript/API JSON: `camelCase`
- UUID: PostgreSQL UUID
- DateTime storage: UTC ISO 8601
- Display timezone: Asia/Seoul
- Soft delete는 실제 필요가 확인된 객체에만 적용

## 2. 초기 핵심 테이블

### farms

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 농장 식별자 |
| name | text | Y | 농장명 |
| region_code | text | Y | 행정·기상 연결용 지역 코드 |
| cultivation_environment | enum | Y | facility 또는 open_field |
| cultivation_method | text | Y | 재배방식 |
| sensor_usage | boolean | Y | 센서 사용 여부 |
| created_at | timestamptz | Y | 생성 시각 |
| updated_at | timestamptz | Y | 수정 시각 |

### farm_memberships

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 관계 식별자 |
| farm_id | uuid | Y | 농장 |
| user_id | uuid | Y | Supabase Auth 사용자 |
| role | enum | Y | owner, farmer, admin |
| created_at | timestamptz | Y | 생성 시각 |

### crop_cycles

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 작기 식별자 |
| farm_id | uuid | Y | 농장 |
| crop_code | text | Y | 초기 strawberry |
| cultivar | text | Y | 초기 설향 |
| transplant_date | date | Y | 정식일 |
| growth_stage | enum | Y | 현재 생육단계 |
| status | enum | Y | active, completed, cancelled |
| ended_at | timestamptz | N | 종료 시각 |

### task_templates

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 템플릿 식별자 |
| crop_code | text | Y | 작물 |
| cultivar | text | N | 품종, null은 공통 |
| growth_stage | enum | Y | 적용 생육단계 |
| task_type | text | Y | 확인, 기록, 관리 등 |
| title | text | Y | 작업 제목 |
| reason_template | text | Y | 작업 이유 |
| priority | enum | Y | low, medium, high |
| result_schema | jsonb | Y | 결과 선택 구조 |
| expert_review_status | enum | Y | draft, approved, rejected |
| version | integer | Y | 규칙 버전 |

### farm_tasks

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 작업 식별자 |
| farm_id | uuid | Y | 농장 |
| crop_cycle_id | uuid | Y | 작기 |
| task_template_id | uuid | N | 생성 근거 템플릿 |
| parent_issue_id | uuid | N | 후속 작업의 원본 문제 |
| title | text | Y | 작업 제목 |
| task_type | text | Y | 작업 유형 |
| reason | text | Y | 작업 이유 |
| priority | enum | Y | low, medium, high |
| recommended_at | timestamptz | N | 권장 시각 |
| due_at | timestamptz | N | 완료 권장 시각 |
| evidence | jsonb | Y | 근거 목록 |
| source_type | enum | Y | template, manual, rule, external, ai |
| status | enum | Y | pending, in_progress, completed, issue_reported, cancelled |
| result_required | boolean | Y | 결과 기록 필요 여부 |
| safety_level | enum | Y | info, check, caution, field_check, expert_check, hold |
| created_at | timestamptz | Y | 생성 시각 |
| completed_at | timestamptz | N | 완료 시각 |

### action_logs

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 실행 기록 식별자 |
| farm_task_id | uuid | Y | 작업 |
| user_id | uuid | Y | 기록 사용자 |
| action_type | enum | Y | viewed, started, completed, issue_reported, memo_added |
| result_code | text | N | 정상·문제·미확인 등 |
| note | text | N | 짧은 메모 |
| performed_at | timestamptz | Y | 현장 수행 시각 |
| created_at | timestamptz | Y | 저장 시각 |

### issue_records

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 문제 식별자 |
| farm_task_id | uuid | Y | 원본 작업 |
| crop_cycle_id | uuid | Y | 작기 |
| observed_symptom | text | Y | 사용자가 관찰한 사실 |
| severity | enum | Y | low, medium, high, unknown |
| status | enum | Y | open, needs_review, resolved, closed_without_action |
| expert_review_required | boolean | Y | 전문가 확인 필요 여부 |
| created_at | timestamptz | Y | 생성 시각 |
| resolved_at | timestamptz | N | 해결 시각 |

### attachments

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 파일 식별자 |
| action_log_id | uuid | N | 실행 기록 |
| issue_record_id | uuid | N | 문제 기록 |
| storage_path | text | Y | Supabase Storage 경로 |
| mime_type | text | Y | 이미지 형식 |
| file_size_bytes | bigint | Y | 파일 크기 |
| captured_at | timestamptz | N | 촬영 시각 |
| created_at | timestamptz | Y | 업로드 시각 |

## 3. Enum 초안

### growth_stage

`establishment`, `flower_bud`, `flowering`, `fruit_growth`, `harvest`, `post_harvest`, `unknown`

농업 전문가는 실제 설향 단계 기준과 한글 표시명을 검토해야 합니다.

### safety_level

- `info`
- `check`
- `caution`
- `field_check`
- `expert_check`
- `hold`

## 4. 외부정보 확장 필드

외부 연동 전까지 migration에 포함하지 않아도 됩니다.

### data_sources

- source_id
- source_name
- official_url
- license_type
- attribution_required
- commercial_use_allowed
- modification_allowed
- third_party_rights
- license_checked_at

### normalized_contents

- content_id
- category
- title
- summary
- crop_code
- cultivar
- growth_stage
- region_code
- source_id
- original_source_url
- source_updated_at
- retrieved_at
- analysis_type

## 5. PII

초기 핵심 농작업 데이터는 개인정보와 분리합니다. 사용자 이메일 등 인증정보는 Supabase Auth를 따르며 애플리케이션 테이블에 불필요하게 복제하지 않습니다.
