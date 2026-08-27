# Data Dictionary

**Status: CURRENT PLATFORM DATA CONTRACT — implemented v0.1 schema plus FarmArea work context, Observation, Measurement and KMA Weather v0.2 additions**

**Note: migration은 farms, farm_creator_permissions, farm_memberships, farm_invitations, crop_cycles, task_templates, farm_tasks, action_logs, issue_records, attachments, farm_areas, observations, measurements와 KMA Weather용 external_data_snapshots를 구현합니다. `crop_cycles.farm_area_id`와 `farm_tasks.farm_area_id`는 같은 Farm의 FarmArea만 참조하도록 composite foreign key로 보호됩니다. Attachment 파일은 비공개 Supabase Storage 버킷에 저장됩니다.**

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
Farm → Observation ────────→ IssueRecord
ActionLog | IssueRecord → Attachment
TaskTemplate → FarmTask

Farm → FarmArea → optional CropCycle / FarmTask / Observation / Measurement
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
| weather_location_label | text | N | 사용자가 확인한 예보 위치 이름; 상세 주소 아님 |
| weather_grid_x / weather_grid_y | integer | N/N | 기상청 5km 동네예보 격자; 원래 GPS 좌표 아님 |
| weather_location_updated_at | timestamptz | N | 예보 위치를 마지막으로 확인·저장한 시각 |
| created_at / updated_at | timestamptz | Y | 생성·수정 시각 |

`202608180001_farm_owner_creation_policy.sql`은 Farm 생성 INSERT를 owner creation permission으로, Farm 기본정보 UPDATE를 owner/admin으로 제한합니다. `GET /api/farms`, `GET/PATCH /api/farms/{farmId}`와 `GET /api/farms/{farmId}/crop-cycles`는 이 계약을 재사용합니다. 수정 대상은 `name`, `region_code`, `cultivation_environment`, `cultivation_method`이며 하위 CropCycle과 FarmTask를 변경하지 않습니다.

### farm_creator_permissions

| Field | Type | Required | Meaning |
|---|---|---:|---|
| user_id | uuid PK | Y | 새 Farm을 만들 수 있는 Supabase Auth 사용자 |
| granted_at | timestamptz | Y | 권한 부여 시각 |

이 테이블은 전역 owner creation entitlement만 표현하며 FarmMembership나 일반 사용자 프로필을 대체하지 않습니다. 사용자 직접 조회·변경 권한은 부여하지 않고, RLS의 `can_create_farms()` security-definer 함수만 읽습니다. migration은 기존 FarmMembership `owner`를 seed하고, 초대로 생긴 admin/farmer는 자동으로 추가하지 않습니다.

### farm_memberships

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 관계 식별자 |
| farm_id | uuid | Y | Farm |
| user_id | uuid | Y | Supabase Auth 사용자 |
| role | text | Y | owner, farmer, admin |
| created_at | timestamptz | Y | 생성 시각 |

`owner`, `admin`, `farmer`는 기존 값과 제약을 유지합니다. owner/admin은 Farm·CropCycle·FarmTask 계획과 Issue 상태를 관리하고, farmer는 읽기와 ActionLog·IssueRecord·Attachment 기록만 수행합니다. 구성원 관리 권한은 owner와 admin에 별도 RPC로 제한합니다.

### farm_invitations

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 초대 식별자 |
| farm_id | uuid | Y | 대상 Farm |
| email | text | Y | 소문자로 정규화한 수신 이메일 |
| role | text | Y | admin 또는 farmer |
| token_hash | text | Y | 초대 링크 토큰의 SHA-256 해시 |
| status | text | Y | pending, accepted, revoked, expired |
| invited_by | uuid | N | 초대한 Supabase Auth 사용자 |
| expires_at | timestamptz | Y | 생성 후 7일의 UTC 만료 시각 |
| accepted_at / revoked_at | timestamptz | N | 수락·취소 시각 |
| created_at | timestamptz | Y | 생성 시각 |

`202608140002_core_v01_farm_memberships.sql`은 `farm_invitations`와 role-checked security-definer RPC를 추가합니다. `202608170001_fix_farm_invitation_email_validation.sql`은 같은 RPC의 PostgreSQL 이메일 형식 검증을 교정하고, `202608170002_fix_farm_invitation_email_ambiguity.sql`은 대기 초대 갱신의 모호한 `email` 컬럼 참조를 교정합니다. `202608170003_fix_farm_invitation_digest_schema.sql`은 보안상 제한된 `search_path`에서도 Supabase `pgcrypto` 해시 함수를 명시적으로 호출하게 합니다. 대기 중인 초대는 Farm과 이메일 조합당 하나이며, 새 초대를 만들면 같은 대상의 이전 대기 초대는 취소됩니다. 이메일은 동일 이메일 수락 확인과 관리 UI를 위해 초대 테이블에만 최소 보관하고, 토큰 원문은 저장하지 않습니다.

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

`growth_stage`는 현재 작기의 Crop Pack 단계 용어를 저장하는 선택 텍스트입니다. `PATCH /api/crop-cycles/{cropCycleId}`로 접근 가능한 사용자가 값을 변경하거나 null로 비울 수 있습니다. `PATCH /api/crop-cycles/{cropCycleId}/status`는 진행 중 작기를 `completed` 또는 `cancelled`로 변경합니다. `202608140001_core_v01_crop_cycle_lifecycle.sql`의 trigger가 서버 UTC 시각을 `ended_at`에 기록하고, 종료 상태의 재변경과 종료 시각 변경을 DB에서 막습니다. 생육 단계 변경과 작기 종료는 이미 생성된 FarmTask의 일정이나 템플릿을 자동으로 변경하지 않습니다.

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
| assigned_user_id | uuid | N | 같은 Farm의 담당 FarmMembership User |
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

`source_type = manual`은 owner/admin이 진행 중인 CropCycle에 직접 추가한 작업이다. `task_template_id`와 `parent_issue_id`는 null이며, Core는 Crop별 처방을 만들지 않기 위해 `task_type = manual`, `evidence = []`, `verification_status = draft`로 저장한다. 생성은 기존 Farm membership 기반 manager RLS와 `POST /api/crop-cycles/{cropCycleId}/tasks`의 active CropCycle 확인을 모두 통과해야 한다.

`pending → cancelled`는 기존 `farm_tasks.status`를 재사용하는 owner/admin 전용 상태 전환이다. 취소는 FarmTask를 삭제하거나 ActionLog를 만들지 않으며, 취소된 작업은 전체 일정에는 보존되고 Today 조회에서는 제외된다.

`202608220002_core_v01_task_assignment.sql`은 선택적 `assigned_user_id`와 같은 Farm 구성원 제약 trigger를 추가한다. owner/admin은 role-checked RPC를 통해 `pending`, `in_progress` FarmTask만 배정·해제할 수 있다. 담당자 배정은 작업 조율 정보이며 ActionLog 기록 권한·작업 상태를 바꾸지 않는다. 담당 구성원이 Farm에서 제거되면 해당 담당자 값만 null로 비우며 기존 FarmTask와 실행 이력은 보존한다.

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

`202608120002_core_v01_task_results.sql`은 ActionLog를 실제 테이블·RLS로 구현합니다. `202608220001_core_v01_task_start.sql`은 기존 결과 RPC를 확장해 UI/API가 `started`, `completed`, `not_checked`, `issue_reported`를 기록하게 합니다. `started`는 `pending` FarmTask를 한 번 `in_progress`로 갱신하고 Today에 남깁니다. 완료는 `completed`로 갱신하며, 미확인은 상태를 유지합니다.

### issue_records

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 문제 식별자 |
| action_log_id | uuid | task origin | 연결된 `issue_reported` ActionLog, 1:1 |
| farm_task_id | uuid | task origin | 원본 FarmTask |
| observation_id | uuid | observation origin | 원본 Observation, 1:1 |
| crop_cycle_id | uuid | N | 작기 문맥; Observation origin에서는 Observation의 문맥을 보존 |
| observed_symptom | text | Y | 사용자가 관찰한 사실 |
| severity | text | Y | low, medium, high, unknown |
| status | text | Y | open, needs_review, resolved, closed_without_action |
| expert_review_required | boolean | Y | 전문가 확인 필요 여부 |
| created_at / resolved_at | timestamptz | Y/N | 생성·해결 시각 |

`202608120003_core_v01_issues.sql`은 IssueRecord, RLS와 원자적 작업 문제 기록 RPC를 구현합니다. `202608250002_platform_v02_observation_issues.sql`은 기존 작업 origin을 보존하면서 Observation origin을 하나 추가합니다. 두 origin 경로 중 정확히 하나만 허용하며, Observation 하나에는 IssueRecord 하나만 연결할 수 있습니다. 문제 내용은 사용자가 관찰한 사실이며 확정 진단이나 처방이 아닙니다. `farm_tasks.parent_issue_id`는 IssueRecord를 참조하고, 같은 IssueRecord에 같은 예정일로 중복된 Follow-up FarmTask를 만들 수 없도록 제약합니다. Observation origin에서 Follow-up은 Observation에 CropCycle 문맥이 있을 때만 가능합니다.

### attachments

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 파일 식별자 |
| action_log_id | uuid | N | ActionLog |
| issue_record_id | uuid | N | IssueRecord |
| storage_path | text | Y | Supabase Storage 경로 |
| mime_type / file_size_bytes | text / bigint | Y | 파일 형식·크기 |
| captured_at / created_at | timestamptz | N/Y | 촬영·업로드 시각 |

`202608120004_core_v01_attachments.sql`은 `attachments`와 비공개 `farm-attachments` Storage 버킷을 구현합니다. 한 Attachment는 ActionLog 또는 IssueRecord 중 정확히 하나만 참조합니다. 허용 파일은 JPEG, PNG, WebP이고 파일당 최대 10MB입니다. Task-origin path는 `farm_id/action_log_id/file`, Observation-origin Issue path는 `farm_id/issue_record_id/file`이며, Attachment와 Storage object 모두 FarmMembership 기반 RLS를 적용합니다. `captured_at`은 P1에서 아직 별도로 수집하지 않아 null입니다.

## 4. v0.2 data additions

These are minimal extension candidates, not a migration backlog to apply at once. Each structure is introduced only with the Vertical Slice that reads and writes it.

### farms weather location context (implemented by `202608250001_platform_v02_weather_foundation.sql`)

| Field | Type | Required | Meaning |
|---|---|---:|---|
| weather_location_label | text | N | 사용자가 확인한 예보 위치 이름; 상세 주소 아님 |
| weather_grid_x / weather_grid_y | integer | N/N | 선택한 기상청 5km 예보 격자 |
| weather_location_updated_at | timestamptz | N | 마지막 위치 확인·저장 시각 |

No street address or silent browser GPS is stored. The user must explicitly request browser location, which is converted locally to grid X/Y before the API request; the existing `region_code` is not assumed to be a valid KMA grid.

### farm_areas (implemented in `202608240001_platform_v02_farm_areas.sql`)

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 재배 구역 식별자 |
| farm_id | uuid | Y | 소속 Farm |
| name | text | Y | 예: 1동, 육묘장, 노지 A구역 |
| description | text | N | 짧은 운영 메모 |
| created_at / updated_at | timestamptz | Y | 생성·수정 시각 |

`unique (farm_id, name)` is sufficient for the Pilot. No GIS geometry, address or sensor fields are introduced.

### crop_cycles / farm_tasks FarmArea link (implemented by `202608260001_platform_v02_farm_area_work_context.sql`)

| Table | Field | Type | Required | Meaning |
|---|---|---|---:|---|
| crop_cycles | farm_area_id | uuid FK | N | 작기의 주 재배 구역 |
| farm_tasks | farm_area_id | uuid FK | N | 작업의 대상 재배 구역 |

Database validation must ensure that the selected FarmArea belongs to the same Farm as the CropCycle/FarmTask.

작기 수준의 `cultivation_method` override는 이 Slice에 추가하지 않는다. Farm 기본 재배방식은 기존 `farms.cultivation_method`를 계속 사용한다.

### observations (implemented by `202608240002_platform_v02_observations.sql`)

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 관찰 식별자 |
| farm_id | uuid | Y | Farm |
| farm_area_id / crop_cycle_id | uuid | N/N | 선택적 재배 구역·작기 문맥 |
| observed_by | uuid | Y | 기록한 사용자 |
| observed_at | timestamptz | Y | 관찰 시각 |
| content | text | Y | 관찰된 사실 |
| created_at | timestamptz | Y | 저장 시각 |

Observation is append-only, is not a diagnosis and does not require a FarmTask. `farm_area_id` and `crop_cycle_id` are composite foreign-key constrained to the same `farm_id`.

### measurements (implemented by `202608240003_platform_v02_measurements.sql`)

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 측정 식별자 |
| farm_id | uuid | Y | Farm |
| farm_area_id / crop_cycle_id | uuid | N/N | 선택적 재배 구역·작기 문맥 |
| recorded_by | uuid | Y | 기록한 사용자 |
| observed_at | timestamptz | Y | 측정 시각 |
| metric_code | text | Y | 측정 종류 코드 |
| value_numeric | numeric | Y | 측정값 |
| unit | text | Y | 단위 |
| note | text | N | 선택 메모 |
| created_at | timestamptz | Y | 저장 시각 |

Measurement begins as a manual field record. Sensor ingestion is not part of this contract.

### issue_records observation origin (implemented by `202608250002_platform_v02_observation_issues.sql`)

Existing v0.1 task-result IssueRecords remain valid. `observation_id uuid null references observations(id)` is added with a partial unique index, and an exactly-one-origin check permits either the existing ActionLog/FarmTask path or the new Observation path. This does not change or delete existing IssueRecords.

### external_data_snapshots (implemented for Weather, Nongsaro Disease/Pest and Crop Reference by dedicated migrations)

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | snapshot 식별자 |
| farm_id | uuid FK | Y | 조회 문맥 Farm |
| module | text | Y | `weather`, `disease_pest` 또는 `crop_information`; 후속 Module은 별도 migration 검토 |
| context_key | text | Y | provider query와 정규화 버전의 cache key |
| payload | jsonb | Y | 정규화된 공개 정보 payload, raw provider response 아님 |
| provider / source_name / source_reference | text | Y | 출처 추적 정보 |
| observed_at / published_at | timestamptz | N/N | provider 기준 시각 |
| retrieved_at / expires_at | timestamptz | Y/Y | 수집·fresh 만료 시각 |
| verification_status | text | Y | official_source 또는 cached_official_source |
| created_at / updated_at | timestamptz | Y/Y | snapshot 생성·갱신 시각 |

KMA Weather, Nongsaro Disease/Pest occurrence bulletin과 Crop Pack-mapped Nongsaro crop-reference는 이 focused durable snapshot store를 마지막 정상 정보 fallback에 사용한다. 이는 raw-data warehouse, provider request log 또는 Redis 의존성을 도입하지 않는다.

## 5. 검증 상태

| Value | Meaning |
|---|---|
| `draft` | 개발·연구·Mock·Fixture |
| `evidence_checked` | 공식자료 또는 논문 근거 확인 |
| `expert_reviewed` | 농업 전문가 검토 |
| `field_validated` | 현장 검증 |

초기 Fixture와 Mock은 `draft`입니다. 검증 상태는 농업 처방의 확정 여부를 의미하지 않으며, 화면에서도 명확히 구분합니다.

## 6. 범위 밖 데이터

`ExternalRawData`, generic `ApiCallLog`, Sensor, AI 관련 테이블은 현재 migration에 포함하지 않습니다. v0.2 Weather는 정규화된 공식 결과만 `external_data_snapshots`에 저장하며 원본 KMA 응답과 API key는 저장하지 않습니다. 데이터 출처, 안전성, 라이선스, 운영 책임과 RLS를 확인하지 않은 provider 데이터는 저장하지 않습니다.

## 7. PII

사용자 계정의 원본 이메일과 인증정보는 Supabase Auth가 관리합니다. 다만 대기 중 FarmInvitation은 같은 이메일 수락 확인을 위해 정규화한 수신 이메일만 최소 보관하며, manager RLS와 security-definer RPC로 보호합니다. FarmMembership의 구성원 이메일은 Auth에서 권한 있는 owner/admin에게만 조회해 반환하며 별도 복제하지 않습니다. Farm 데이터는 FarmMembership와 RLS로 보호합니다.
