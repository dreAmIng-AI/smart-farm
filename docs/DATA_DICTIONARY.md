# Data Dictionary

**Status: CURRENT IMPLEMENTATION CONTRACT**

**Note: 이 문서는 Core v0.1의 현재 구현 계약입니다. migration은 farms, farm_memberships, farm_invitations, crop_cycles, task_templates, farm_tasks, action_logs, issue_records와 attachments를 구현합니다. Attachment 파일은 비공개 Supabase Storage 버킷에 저장됩니다.**

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

초기 foundation migration은 FarmMembership 기반 SELECT·UPDATE RLS와 `updated_at` trigger를 이미 제공합니다. `GET /api/farms`, `GET/PATCH /api/farms/{farmId}`와 `GET /api/farms/{farmId}/crop-cycles`는 이 기존 계약을 재사용하며, Farm 목록·작기 선택과 기본정보 수정에 필요한 새 DB migration은 없습니다. 수정 대상은 `name`, `region_code`, `cultivation_environment`, `cultivation_method`이며 하위 CropCycle과 FarmTask를 변경하지 않습니다.

### farm_memberships

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 관계 식별자 |
| farm_id | uuid | Y | Farm |
| user_id | uuid | Y | Supabase Auth 사용자 |
| role | text | Y | owner, farmer, admin |
| created_at | timestamptz | Y | 생성 시각 |

`owner`, `admin`, `farmer`는 기존 값과 제약을 유지합니다. 이 Slice는 Farm·작기·작업 기록의 기존 FarmMembership RLS를 변경하지 않습니다. 구성원 관리 권한만 owner와 admin에 별도 RPC로 제한합니다.

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

`202608140002_core_v01_farm_memberships.sql`은 `farm_invitations`와 role-checked security-definer RPC를 추가합니다. `202608170001_fix_farm_invitation_email_validation.sql`은 같은 RPC의 PostgreSQL 이메일 형식 검증을 교정합니다. 대기 중인 초대는 Farm과 이메일 조합당 하나이며, 새 초대를 만들면 같은 대상의 이전 대기 초대는 취소됩니다. 이메일은 동일 이메일 수락 확인과 관리 UI를 위해 초대 테이블에만 최소 보관하고, 토큰 원문은 저장하지 않습니다.

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

`202608120002_core_v01_task_results.sql`은 ActionLog를 실제 테이블·RLS로 구현합니다. UI/API는 `completed`, `not_checked`, `issue_reported`를 기록합니다. 완료는 FarmTask를 `completed`로 갱신하고, 미확인은 상태를 유지해 Today에 남깁니다.

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

`202608120003_core_v01_issues.sql`은 IssueRecord, RLS와 원자적 문제 기록 RPC를 구현합니다. 문제 내용은 사용자가 관찰한 사실이며 확정 진단이나 처방이 아닙니다. `farm_tasks.parent_issue_id`는 IssueRecord를 참조하고, 같은 IssueRecord에 같은 예정일로 중복된 Follow-up FarmTask를 만들 수 없도록 제약합니다. `202608130001_core_v01_issue_status.sql`은 FarmMembership 기반 UPDATE RLS와 `status`, `resolved_at` 두 컬럼의 UPDATE 권한만 추가합니다. `resolved`에서만 `resolved_at`을 기록하며, 이 migration은 관찰 내용과 심각도를 변경할 권한을 부여하지 않습니다.

### attachments

| Field | Type | Required | Meaning |
|---|---|---:|---|
| id | uuid | Y | 파일 식별자 |
| action_log_id | uuid | N | ActionLog |
| issue_record_id | uuid | N | IssueRecord |
| storage_path | text | Y | Supabase Storage 경로 |
| mime_type / file_size_bytes | text / bigint | Y | 파일 형식·크기 |
| captured_at / created_at | timestamptz | N/Y | 촬영·업로드 시각 |

`202608120004_core_v01_attachments.sql`은 `attachments`와 비공개 `farm-attachments` Storage 버킷을 구현합니다. 한 Attachment는 ActionLog 또는 IssueRecord 중 정확히 하나만 참조합니다. 허용 파일은 JPEG, PNG, WebP이고 파일당 최대 10MB입니다. `storage_path`는 `farm_id/action_log_id/file` 구조이며, Attachment와 Storage object 모두 FarmMembership 기반 RLS를 적용합니다. `captured_at`은 P1에서 아직 별도로 수집하지 않아 null입니다.

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

사용자 계정의 원본 이메일과 인증정보는 Supabase Auth가 관리합니다. 다만 대기 중 FarmInvitation은 같은 이메일 수락 확인을 위해 정규화한 수신 이메일만 최소 보관하며, manager RLS와 security-definer RPC로 보호합니다. FarmMembership의 구성원 이메일은 Auth에서 권한 있는 owner/admin에게만 조회해 반환하며 별도 복제하지 않습니다. Farm 데이터는 FarmMembership와 RLS로 보호합니다.
