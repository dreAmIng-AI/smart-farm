# API Contract

**Status: CURRENT PLATFORM API CONTRACT — implemented v0.1 routes plus FarmArea, Observation and Measurement v0.2 routes**

**Note: 실제 계약의 단일 원본은 구현 스키마와 테스트입니다. 현재 Farm·CropCycle·계획·일정·Today·결과 기록·Issue·사진 첨부·후속 작업·이력·FarmArea·Observation·Measurement endpoint가 구현되어 있습니다. 아래 `planned v0.2` endpoint는 구현되지 않았으며 해당 Vertical Slice의 migration·RLS·테스트와 함께만 활성화됩니다.**

## 1. 공통 원칙

- API JSON은 `camelCase`, 시간은 ISO 8601 UTC를 사용합니다.
- 인증은 Supabase 세션을 기준으로 하고 Farm 접근은 RLS와 서버 검증을 따릅니다.
- Core v0.1 API는 작물 이름으로 비즈니스 로직을 분기하지 않습니다.
- v0.1 Core API는 외부 API, AI, Sensor 호출에 의존하지 않습니다. v0.2 Baseline Module은 독립 endpoint와 typed fallback을 통해서만 추가합니다.
- 실제 endpoint와 오류 코드는 구현 시 코드 스키마·테스트·이 문서를 함께 갱신합니다.

### 목록 응답

```json
{
  "items": [],
  "meta": { "count": 0 }
}
```

### 오류 응답

```json
{
  "error": {
    "code": "FARM_NOT_FOUND",
    "message": "Farm not found",
    "requestId": "req_123"
  }
}
```

## 2. P0 Core Resource Contract

| Resource / action | Intent |
|---|---|
| `GET/POST /api/farms` | 접근 가능한 Farm 목록 조회·Farm 생성 |
| `GET/PATCH /api/farms/{farmId}` | 접근 가능한 Farm 조회·수정 |
| `GET /api/farms/{farmId}/collaboration` | 현재 사용자의 역할과 관리 가능한 구성원·대기 초대 조회 |
| `POST /api/farms/{farmId}/invitations` | 역할 제한이 적용된 직접 전달용 초대 링크 생성 |
| `DELETE /api/farms/{farmId}/invitations/{invitationId}` | 대기 중 Farm 초대 취소 |
| `PATCH/DELETE /api/farms/{farmId}/members/{memberUserId}` | owner의 역할 변경 또는 owner/admin의 구성원 제거 |
| `POST /api/farm-invitations/accept` | 로그인 이메일과 일치하는 초대 링크 수락 |
| `GET/POST /api/farms/{farmId}/crop-cycles` | 접근 가능한 Farm의 CropCycle 목록 조회·CropCycle 생성 |
| `PATCH /api/crop-cycles/{cropCycleId}` | 현재 생육 단계 변경 또는 비우기 |
| `PATCH /api/crop-cycles/{cropCycleId}/status` | 진행 중 CropCycle 완료·취소 처리 |
| `POST /api/crop-cycles/{cropCycleId}/tasks/generate` | TaskTemplate을 예정 FarmTask로 적용해 작기 계획 생성 |
| `POST /api/crop-cycles/{cropCycleId}/tasks` | owner/admin이 진행 중 CropCycle에 직접 FarmTask 등록 |
| `GET /api/crop-cycles/{cropCycleId}/schedule` | 작기 전체 일정 조회 |
| `GET /api/farms/{farmId}/tasks/today` | 오늘·지연·후속 작업 조회 |
| `GET /api/tasks/{taskId}` | 작업 상세와 근거·검증 상태 조회 |
| `PATCH /api/tasks/{taskId}/assignee` | owner/admin의 FarmTask 담당자 배정·해제 |
| `POST /api/tasks/{taskId}/action-logs` | 결과 기록, 필요 시 IssueRecord 생성 |
| `POST /api/action-logs/{actionLogId}/attachments` | 결과 기록에 사진 첨부 |
| `POST /api/issues/{issueId}/attachments` | 문제 기록에 사진 첨부 |
| `GET/POST /api/farms/{farmId}/areas` | 재배 구역 조회·생성 |
| `PATCH /api/issues/{issueId}` | IssueRecord 상태 변경 |
| `POST /api/issues/{issueId}/follow-up-tasks` | IssueRecord 기반 후속 작업 생성 |
| `GET /api/farms/{farmId}/history` | 작업·문제·후속 관계 이력 조회 |

## 2.1 Farm owner and manager authorization

`GET /api/farms` returns the authenticated user's visible Farms plus `permissions.canCreateFarm`. Only a user with this flag may call `POST /api/farms`; an invited `admin` or `farmer` receives `FARM_CREATION_FORBIDDEN` (403).

```json
{
  "items": [],
  "meta": { "count": 0 },
  "permissions": { "canCreateFarm": false }
}
```

`PATCH /api/farms/{farmId}`, CropCycle creation/growth-stage/end, planned FarmTask generation, FarmTask cancellation and FarmTask 담당자 배정 require the selected Farm role to be `owner` or `admin`. A visible Farm for which the actor is a `farmer` returns `FARM_MANAGEMENT_FORBIDDEN` (403) for application-checked Farm management routes; RLS is the final protection for every mutation. `PATCH /api/issues/{issueId}` and `POST /api/issues/{issueId}/follow-up-tasks` are also limited to owner/admin by RLS and role-checked RPC.

Every Farm member may call the result/observed-issue and attachment APIs for the shared Farm. Result and issue RPCs explicitly verify the caller's FarmMembership before they change a FarmTask, so a farmer does not receive general FarmTask planning update access.

## 3. 주요 입력 예시

### Farm 조회·기본정보 수정

`GET /api/farms/{farmId}`는 접근 가능한 Farm의 기본정보를 반환합니다. `PATCH /api/farms/{farmId}`는 `name`, `regionCode`, `cultivationEnvironment`, `cultivationMethod` 전체를 유효성 검증한 뒤 갱신합니다. 기존 `farm_memberships` 기반 RLS를 재사용하며, 하위 CropCycle·FarmTask·ActionLog·IssueRecord는 변경하지 않습니다.

```json
{
  "name": "Demo Farm",
  "regionCode": "KR-DEMO",
  "cultivationEnvironment": "facility",
  "cultivationMethod": "protected_cultivation"
}
```

성공 시 `200`과 갱신된 camelCase Farm 객체를 반환합니다. 접근할 수 없는 Farm은 `FARM_NOT_FOUND`(404)로 응답합니다.

### 저장된 Farm·CropCycle 목록 조회

`GET /api/farms`는 로그인 사용자가 FarmMembership RLS로 접근할 수 있는 Farm 목록을 생성일 내림차순으로 반환합니다. `GET /api/farms/{farmId}/crop-cycles`는 접근 가능한 Farm의 CropCycle 목록을 정식일 내림차순으로 반환합니다. 두 목록 조회 모두 기존 RLS를 그대로 사용하며, 선택한 CropCycle의 TaskTemplate 적용이나 FarmTask 생성을 수행하지 않습니다. 성공 응답은 `{ items, meta: { count } }` 형식입니다.

### Farm 구성원 초대·역할

`GET /api/farms/{farmId}/collaboration`은 현재 사용자의 `actorRole`을 반환합니다. owner/admin에게만 구성원 이메일·역할과 유효한 대기 초대 목록을 반환하며 farmer에는 빈 목록을 반환합니다. `POST /api/farms/{farmId}/invitations`는 `{ "email", "role" }`을 받아 직접 전달할 `inviteUrl`을 반환합니다. `role`은 `admin` 또는 `farmer`이며, owner만 admin을 초대할 수 있습니다. 초대 원문 토큰은 응답에서만 반환하고 DB에는 저장하지 않습니다.

```json
{
  "email": "farmer@example.com",
  "role": "farmer"
}
```

`POST /api/farm-invitations/accept`는 로그인한 사용자가 링크의 UUID 토큰을 수락합니다. 링크를 연 신규 사용자는 브라우저에서 Supabase Auth 계정을 직접 설정한 뒤 같은 endpoint를 호출하며, 기존 사용자는 로그인 후 바로 호출합니다. 비밀번호는 이 Core API에 전달하지 않습니다. DB RPC가 Supabase Auth 이메일과 초대 이메일을 비교하고 FarmMembership 생성 및 초대 상태 변경을 원자적으로 수행합니다. 이메일 불일치, 만료, 취소, 중복 수락은 `FARM_INVITATION_ACCEPT_FAILED`(400)입니다.

```json
{
  "token": "11111111-1111-4111-8111-111111111111"
}
```

owner만 `PATCH /api/farms/{farmId}/members/{memberUserId}`로 non-owner를 admin/farmer로 변경할 수 있습니다. `DELETE /api/farms/{farmId}/members/{memberUserId}`는 owner가 admin/farmer를, admin이 farmer만 제거할 수 있습니다. owner 역할 이전·제거 및 자동 이메일 발송은 이 Slice 범위 밖입니다.

### CropCycle 생성

```json
{
  "cropCode": "reference_crop",
  "cultivar": "reference_variety",
  "transplantDate": "2026-09-10",
  "growthStage": "flowering"
}
```

Strawberry / Seolhyang은 첫 Fixture 값일 수 있지만, API 계약 자체는 특정 값에 의존하지 않습니다.

### 현재 생육 단계 변경

`PATCH /api/crop-cycles/{cropCycleId}`는 접근 가능한 CropCycle의 현재 `growthStage`만 바꿉니다. Crop Pack의 용어를 자유 텍스트로 받으며, Core는 작물별 선택 목록이나 농업 규칙을 하드코딩하지 않습니다. 빈 문자열 또는 `null`은 현재 생육 단계를 비웁니다. 최대 길이는 100자입니다.

```json
{
  "growthStage": "flowering"
}
```

성공 시 생성 API와 같은 CropCycle 정보를 `200`으로 반환합니다. 기존 FarmTask, TaskTemplate 또는 작기 일정은 자동 생성·수정·재일정하지 않습니다.

### CropCycle 종료

`PATCH /api/crop-cycles/{cropCycleId}/status`는 접근 가능한 `active` CropCycle만 `completed` 또는 `cancelled`로 종료합니다. 서버 UTC 시각을 `endedAt`에 기록하고, 기존 FarmTask·ActionLog·IssueRecord·Attachment를 변경하거나 삭제하지 않습니다. 종료된 CropCycle은 다시 활성화하지 않으며 `CROP_CYCLE_ALREADY_ENDED`(409)로 거부합니다. 종료된 CropCycle에서 작업 계획 생성을 요청하면 `CROP_CYCLE_NOT_ACTIVE`(409)로 거부합니다.

```json
{
  "status": "completed"
}
```

### 작기 계획 생성

계획 생성은 CropCycle과 적용 가능한 TaskTemplate을 사용해 예정 FarmTask를 만듭니다. 동일 CropCycle·템플릿·일정 조합의 중복 생성을 방지해야 합니다.

```json
{
  "generatedCount": 3,
  "taskIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

### 직접 FarmTask 등록

`POST /api/crop-cycles/{cropCycleId}/tasks`는 owner/admin이 접근 가능한 `active` CropCycle에만 직접 작업을 추가한다. UI가 입력한 `scheduledFor`의 Asia/Seoul 자정을 UTC로 저장하며, 종료 작기는 `CROP_CYCLE_NOT_ACTIVE`(409), 없는 또는 접근 불가 작기는 `CROP_CYCLE_NOT_FOUND`(404), farmer는 `FARM_MANAGEMENT_FORBIDDEN`(403)으로 거부한다. 기존 `farm_tasks`의 manager INSERT RLS가 최종 보호를 제공한다.

```json
{
  "title": "시설 환기 상태 확인",
  "reason": "현장 운영자가 추가한 점검 작업",
  "scheduledFor": "2026-09-11",
  "priority": "medium"
}
```

성공 시 `201`과 생성된 FarmTask를 반환한다. 직접 작업은 `sourceType: manual`, `taskType: manual`, `verificationStatus: draft`, 빈 `evidence`로 저장하며 Crop Pack의 처방이나 자동 작업 생성을 의미하지 않는다.

### Today 응답의 핵심 필드

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "작업 확인",
      "taskType": "observation",
      "reason": "적용된 Crop Pack 작업 기준",
      "scheduledFor": "2026-09-10T00:00:00Z",
      "priority": "medium",
      "verificationStatus": "draft",
      "sourceType": "template",
      "assignedUserId": null,
      "status": "pending",
      "resultRequired": true,
      "scheduleState": "today"
    }
  ],
  "meta": { "count": 1 }
}
```

`scheduleState`는 Today에서만 포함하며 `today` 또는 `overdue`입니다.

### FarmTask 상세

`GET /api/tasks/{taskId}`는 RLS로 접근 가능한 단일 FarmTask의 실행 문맥을 반환합니다. `reason`, `scheduledFor`, `dueAt`, `priority`, `evidence`, `verificationStatus`, `sourceType`, `assignedUserId`, `resultRequired`, `status`와 생성·완료 시각을 포함합니다. 이 조회는 FarmTask, TaskTemplate 또는 일정 데이터를 수정하지 않습니다. 유효하지 않은 ID는 `VALIDATION_ERROR`(400), 접근할 수 없거나 없는 작업은 `TASK_NOT_FOUND`(404)입니다.

```json
{
  "id": "uuid",
  "title": "작업 확인",
  "reason": "적용된 Crop Pack 작업 기준",
  "scheduledFor": "2026-09-10T00:00:00Z",
  "dueAt": null,
  "priority": "medium",
  "evidence": [],
  "verificationStatus": "draft",
  "sourceType": "template",
  "assignedUserId": null,
  "status": "pending",
  "resultRequired": true
}
```

### 결과·문제 기록

`POST /api/tasks/{taskId}/action-logs`는 `started`, `completed`, `not_checked`, `issue_reported`를 기록합니다. `started`는 `pending` FarmTask에서만 가능하며 ActionLog를 남기고 상태를 `in_progress`로 바꿉니다. 완료는 FarmTask 상태를 `completed`로 바꾸며 미확인은 상태를 유지합니다. 문제 기록은 FarmTask 상태를 `issue_reported`로 바꾸고, 연결된 ActionLog와 IssueRecord를 하나의 RPC에서 생성합니다.

```json
{
  "actionType": "issue_reported",
  "note": "선택적 짧은 메모",
  "issue": {
    "observedSymptom": "사용자가 관찰한 사실",
    "severity": "unknown",
    "expertReviewRequired": false
  },
  "performedAt": "2026-09-10T00:10:00.000Z"
}
```

`performedAt`은 생략하면 서버가 현재 UTC 시각을 기록합니다. `started`는 이미 진행 중이거나 종료된 작업에 다시 기록할 수 없고 `INVALID_STATUS_TRANSITION`(409)을 반환합니다. `issue_reported`에는 `issue`가 필수이고, `observedSymptom`은 관찰 사실입니다. 문제 기록은 확정 진단을 의미하지 않습니다.

### FarmTask 취소

`PATCH /api/tasks/{taskId}`는 owner/admin이 접근 가능한 `pending` FarmTask만 `cancelled`로 전환합니다. 취소는 기존 `farm_tasks` manager UPDATE RLS와 Route Handler의 role 확인을 함께 거치며, 작업을 삭제하거나 ActionLog를 생성하지 않습니다.

```json
{
  "status": "cancelled"
}
```

작업자(farmer)는 `FARM_MANAGEMENT_FORBIDDEN`(403)을 받습니다. 시작됐거나 완료·문제·취소 상태인 작업은 `INVALID_STATUS_TRANSITION`(409)을 반환합니다. 성공한 취소 작업은 전체 일정에 `cancelled`로 남고 Today에서는 제외됩니다.

### FarmTask 담당자 배정

`PATCH /api/tasks/{taskId}/assignee`는 owner/admin이 같은 Farm의 구성원을 `pending` 또는 `in_progress` FarmTask에 배정하거나 해제합니다. 담당자는 일정·Today·상세에서의 조율 정보일 뿐, 담당자가 아닌 Farm 구성원의 작업 시작·완료·문제 기록 권한을 제한하지 않습니다.

```json
{
  "assignedUserId": "uuid-or-null"
}
```

`assignedUserId`는 같은 Farm의 현재 구성원 UUID여야 하며, `null`은 배정 해제입니다. DB trigger와 role-checked RPC가 같은 Farm 구성원 관계를 함께 검증합니다. farmer는 `FARM_MANAGEMENT_FORBIDDEN`(403), 완료·문제·취소 작업은 `INVALID_STATUS_TRANSITION`(409)을 받습니다.

```json
{
  "task": {
    "id": "uuid",
    "assignedUserId": "uuid-or-null"
  }
}
```

### Follow-up FarmTask 생성

`POST /api/issues/{issueId}/follow-up-tasks`는 접근 가능한 미해결(`open`, `needs_review`) IssueRecord에서만 후속 FarmTask를 만듭니다. `scheduledFor`는 UI가 입력한 Asia/Seoul 날짜이며, 서버가 해당 날짜 자정의 UTC 시각으로 변환합니다.

```json
{
  "title": "관찰 내용 재확인",
  "scheduledFor": "2026-09-11",
  "priority": "medium"
}
```

응답 FarmTask의 `sourceType`은 `issue_followup`, `parentIssueId`는 원본 IssueRecord ID입니다. 같은 IssueRecord와 예정일의 중복 생성은 `DUPLICATE_FOLLOW_UP_TASK`(409)로 거부합니다.

### IssueRecord 상태 변경

`PATCH /api/issues/{issueId}`는 접근 가능한 IssueRecord의 상태만 변경합니다. `status`에는 `open`, `needs_review`, `resolved`, `closed_without_action` 중 하나를 전달합니다. `resolved`는 서버 UTC 시각을 `resolvedAt`으로 기록하고, 다른 상태는 `resolvedAt`을 `null`로 비웁니다. 관찰 내용·심각도·원본 FarmTask 관계는 변경하지 않습니다. `resolved`와 `closed_without_action` 상태의 IssueRecord에서는 Follow-up FarmTask를 만들 수 없습니다.

```json
{
  "status": "resolved"
}
```

```json
{
  "issue": {
    "id": "uuid",
    "status": "resolved",
    "resolvedAt": "2026-08-13T01:00:00.000Z"
  }
}
```

### History 조회

`GET /api/farms/{farmId}/history`는 접근 가능한 Farm의 ActionLog, IssueRecord, Follow-up FarmTask를 발생 시각 내림차순으로 반환합니다. Issue 항목은 연결된 ActionLog ID를, Follow-up 항목은 원본 IssueRecord ID를 포함해 관계를 추적할 수 있습니다. ActionLog와 Issue 항목은 `attachments` 배열을 포함하며, `signedUrl`은 비공개 Storage object를 한시적으로 읽는 URL입니다. Storage object가 없거나 읽을 수 없어도 나머지 이력 조회는 성공하고 해당 `signedUrl`은 `null`입니다.

## 4. P1 Attachment

`POST /api/action-logs/{actionLogId}/attachments`와 `POST /api/issues/{issueId}/attachments`는 `multipart/form-data`의 `file` 필드 하나를 받습니다. JPEG, PNG, WebP만 허용하며 파일당 최대 10MB입니다. 서버는 MIME type과 파일 헤더를 함께 검증하고, 비공개 `farm-attachments` 버킷에 업로드한 뒤 Attachment 메타데이터를 저장합니다.

```text
Content-Type: multipart/form-data
file: <JPEG | PNG | WebP, maximum 10 MB>
```

성공 시 `201`과 아래 구조를 반환합니다.

```json
{
  "attachment": {
    "id": "uuid",
    "actionLogId": "uuid 또는 null",
    "issueRecordId": "uuid 또는 null",
    "storagePath": "farm-id/action-log-id/file-id.png",
    "mimeType": "image/png",
    "fileSizeBytes": 12345,
    "capturedAt": null
  }
}
```

`actionLogId`와 `issueRecordId` 중 하나만 값이 있습니다. 업로드는 결과·문제 기록이 성공한 뒤의 별도 요청이므로 `STORAGE_UPLOAD_FAILED` 또는 `ATTACHMENT_CREATE_FAILED`가 발생해도 기존 ActionLog·IssueRecord는 취소하거나 삭제하지 않습니다.

## 5. 오류 코드

- `UNAUTHORIZED`, `SUPABASE_NOT_CONFIGURED`, `FARM_ACCESS_DENIED`, `FARM_NOT_FOUND`
- `FARM_CREATION_FORBIDDEN`, `FARM_CREATION_PERMISSION_LOOKUP_FAILED`, `FARM_MANAGEMENT_FORBIDDEN`, `FARM_PERMISSION_LOOKUP_FAILED`
- `FARM_CREATE_FAILED`, `FARM_LOOKUP_FAILED`, `FARM_UPDATE_FAILED`
- `CROP_CYCLE_NOT_FOUND`, `CROP_CYCLE_CREATE_FAILED`, `CROP_CYCLE_UPDATE_FAILED`, `CROP_CYCLE_LOOKUP_FAILED`, `CROP_CYCLE_ALREADY_ENDED`, `CROP_CYCLE_NOT_ACTIVE`
- `TASK_GENERATION_FAILED`, `MANUAL_TASK_CREATE_FAILED`, `SCHEDULE_LOOKUP_FAILED`, `TODAY_LOOKUP_FAILED`
- `TASK_NOT_FOUND`, `TASK_LOOKUP_FAILED`, `TASK_ASSIGNMENT_UPDATE_FAILED`, `ACTION_LOG_RECORD_FAILED`, `ISSUE_RECORD_FAILED`, `ISSUE_NOT_FOUND`, `ISSUE_LOOKUP_FAILED`, `ISSUE_UPDATE_FAILED`
- `FOLLOW_UP_TASK_CREATE_FAILED`, `DUPLICATE_FOLLOW_UP_TASK`, `HISTORY_LOOKUP_FAILED`
- `ACTION_LOG_NOT_FOUND`, `ATTACHMENT_LOOKUP_FAILED`, `ATTACHMENT_CREATE_FAILED`, `STORAGE_UPLOAD_FAILED`
- `FARM_AREA_LOOKUP_FAILED`, `FARM_AREA_CREATE_FAILED`
- `ACTIVE_CROP_CYCLE_EXISTS`, `DUPLICATE_TASK_GENERATION`
- `INVALID_STATUS_TRANSITION`, `VALIDATION_ERROR`
- `STORAGE_UPLOAD_FAILED`, `INTERNAL_ERROR`

## 6. v0.2 API Contract

### Implemented FarmArea, Observation and Measurement routes

`GET /api/farms/{farmId}/areas` returns the accessible Farm's named FarmAreas in name order. Every Farm member may read it; only owner/admin may use `POST` to create `{ name, description }`. FarmArea update and delete are not exposed in this Slice.

`GET /api/farms/{farmId}/observations` returns newest-first standalone Observation facts for the accessible Farm. Every Farm member may use `POST` with `{ farmAreaId, cropCycleId, observedAt, content }`; the two context IDs are optional, but if supplied must belong to the same Farm. Observations are append-only: no update or delete endpoint exists.

`GET /api/farms/{farmId}/measurements` returns newest-first manual numeric Measurements for the accessible Farm. Every Farm member may use `POST` with `{ farmAreaId, cropCycleId, observedAt, metricCode, valueNumeric, unit, note }`; the two context IDs are optional, but if supplied must belong to the same Farm. Measurements are append-only: no update or delete endpoint exists.

### Planned resource routes

| Resource / action | Intent | Access |
|---|---|---|
| `PATCH/DELETE /api/farm-areas/{farmAreaId}` | FarmArea 수정·삭제 | owner/admin |
| `POST /api/observations/{observationId}/issues` | 관찰 사실을 확인이 필요한 IssueRecord로 연결 | member |
| `GET /api/farms/{farmId}/today-context` | 현재 작기·Today·문제와 Baseline Module summary를 함께 읽기 | member |
| `GET /api/farms/{farmId}/information/weather` | 정규화된 Weather `IntegrationResult` | member |
| `GET /api/farms/{farmId}/information/disease-pest` | 정규화된 Disease/Pest `IntegrationResult` | member |
| `GET /api/farms/{farmId}/information/crop` | 정규화된 Crop Information `IntegrationResult` | member |
| `GET /api/farms/{farmId}/information/market` | 정규화된 Market `IntegrationResult` | member |

The route names are a target contract. The first UI Slice may use only the route(s) it needs, but it may not expose provider-specific payloads or bypass RLS.

### Planned IntegrationResult response

```json
{
  "status": "available | stale | unavailable",
  "data": {},
  "provenance": {
    "provider": "KMA",
    "sourceName": "기상청 단기예보 조회서비스",
    "sourceReference": "official-url-or-dataset-id",
    "observedAt": "2026-08-24T00:00:00.000Z",
    "retrievedAt": "2026-08-24T00:20:00.000Z",
    "verificationStatus": "official_source",
    "freshness": "fresh"
  },
  "message": null
}
```

`unavailable` has `data: null`; it uses a user-safe Korean `message` and can omit provenance when no last successful result exists. An external 4xx/5xx/timeout must not become an error for the existing Today work-list response.

### Implemented Observation input

```json
{
  "farmAreaId": "uuid-or-null",
  "cropCycleId": "uuid-or-null",
  "observedAt": "2026-08-24T01:00:00.000Z",
  "content": "잎에서 갈색 반점이 보임"
}
```

### Implemented Measurement input

```json
{
  "farmAreaId": "uuid-or-null",
  "cropCycleId": "uuid-or-null",
  "observedAt": "2026-08-24T01:00:00.000Z",
  "metricCode": "manual_temperature",
  "valueNumeric": 28.5,
  "unit": "celsius",
  "note": null
}
```

The exact metric catalogue stays open in the Pilot; a Measurement is not an automated sensor feed or recommendation. The API rejects a FarmArea/CropCycle from another Farm with a domain error and RLS remains final protection.

### Measurement and planned error family

- `FARM_AREA_NOT_FOUND`, `FARM_AREA_CREATE_FAILED`, `FARM_AREA_UPDATE_FAILED`
- Implemented Measurement: `MEASUREMENT_CREATE_FAILED`, `MEASUREMENT_LOOKUP_FAILED`
- Implemented Observation: `OBSERVATION_CREATE_FAILED`, `OBSERVATION_LOOKUP_FAILED`, `FARM_AREA_LOOKUP_FAILED`, `FARM_AREA_NOT_FOUND`, `CROP_CYCLE_LOOKUP_FAILED`, `CROP_CYCLE_NOT_FOUND`
- `INTEGRATION_CONTEXT_MISSING`, `INTEGRATION_UNAVAILABLE`, `INTEGRATION_CACHE_LOOKUP_FAILED`

## 7. Out of Scope

Weather, Disease/Pest, Crop Information and Market의 최소 Baseline endpoint는 v0.2 planned이며 아직 구현되지 않았습니다. Sensor, AI/LLM, 자동 진단·추천·제어, 자동 시설 제어, 가격·수확량 예측 endpoint는 v0.2 범위 밖입니다.
