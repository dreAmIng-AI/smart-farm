# API Contract

**Status: CURRENT IMPLEMENTATION CONTRACT**

**Note: 실제 계약의 단일 원본은 구현 스키마와 테스트입니다. 첫 Vertical Slice에는 `POST /api/farms`, `POST /api/farms/{farmId}/crop-cycles`, `POST /api/crop-cycles/{cropCycleId}/tasks/generate`, `GET /api/crop-cycles/{cropCycleId}/schedule`, `GET /api/farms/{farmId}/tasks/today`가 구현되어 있습니다. 이 문서는 그 이후 P0 endpoint의 요구와 경계도 함께 정의합니다.**

## 1. 공통 원칙

- API JSON은 `camelCase`, 시간은 ISO 8601 UTC를 사용합니다.
- 인증은 Supabase 세션을 기준으로 하고 Farm 접근은 RLS와 서버 검증을 따릅니다.
- Core v0.1 API는 작물 이름으로 비즈니스 로직을 분기하지 않습니다.
- 외부 API, AI, Sensor 호출은 Core v0.1 API에 포함하지 않습니다.
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
| `POST /api/farms` | Farm 생성 |
| `GET/PATCH /api/farms/{farmId}` | 접근 가능한 Farm 조회·수정 |
| `POST /api/farms/{farmId}/crop-cycles` | CropCycle 생성 |
| `POST /api/crop-cycles/{cropCycleId}/tasks/generate` | TaskTemplate을 예정 FarmTask로 적용해 작기 계획 생성 |
| `GET /api/crop-cycles/{cropCycleId}/schedule` | 작기 전체 일정 조회 |
| `GET /api/farms/{farmId}/tasks/today` | 오늘·지연·후속 작업 조회 |
| `GET /api/tasks/{taskId}` | 작업 상세와 근거·검증 상태 조회 |
| `POST /api/tasks/{taskId}/action-logs` | 결과 기록, 필요 시 IssueRecord 생성 |
| `POST /api/issues/{issueId}/follow-up-tasks` | IssueRecord 기반 후속 작업 생성 |
| `GET /api/farms/{farmId}/history` | 작업·문제·후속 관계 이력 조회 |

## 3. 주요 입력 예시

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

### 작기 계획 생성

계획 생성은 CropCycle과 적용 가능한 TaskTemplate을 사용해 예정 FarmTask를 만듭니다. 동일 CropCycle·템플릿·일정 조합의 중복 생성을 방지해야 합니다.

```json
{
  "generatedCount": 3,
  "taskIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

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
      "status": "pending",
      "resultRequired": true,
      "scheduleState": "today"
    }
  ],
  "meta": { "count": 1 }
}
```

`scheduleState`는 Today에서만 포함하며 `today` 또는 `overdue`입니다.

### 결과·문제 기록

```json
{
  "actionType": "issue_reported",
  "resultCode": "observed_issue",
  "note": "관찰한 사실을 짧게 기록",
  "performedAt": "2026-09-10T00:10:00Z",
  "issue": {
    "observedSymptom": "사용자 관찰 내용",
    "severity": "unknown"
  }
}
```

문제 기록은 확정 진단을 의미하지 않습니다. `IssueRecord`에서 생성한 Follow-up FarmTask는 원본 IssueRecord를 추적해야 합니다.

## 4. P1 Attachment

사진은 `POST /api/action-logs/{actionLogId}/attachments` 또는 IssueRecord에 연결하는 동일한 계약으로 추가할 수 있습니다. 업로드 실패가 ActionLog 저장을 취소하지 않도록 결과 기록과 파일 업로드를 분리합니다.

## 5. 오류 코드

- `UNAUTHORIZED`, `SUPABASE_NOT_CONFIGURED`, `FARM_ACCESS_DENIED`, `FARM_NOT_FOUND`
- `FARM_CREATE_FAILED`, `FARM_LOOKUP_FAILED`
- `CROP_CYCLE_NOT_FOUND`, `CROP_CYCLE_CREATE_FAILED`, `CROP_CYCLE_LOOKUP_FAILED`
- `TASK_GENERATION_FAILED`, `SCHEDULE_LOOKUP_FAILED`, `TODAY_LOOKUP_FAILED`
- `TASK_NOT_FOUND`, `ISSUE_NOT_FOUND`
- `ACTIVE_CROP_CYCLE_EXISTS`, `DUPLICATE_TASK_GENERATION`
- `INVALID_STATUS_TRANSITION`, `VALIDATION_ERROR`
- `STORAGE_UPLOAD_FAILED`, `INTERNAL_ERROR`

## 6. Out of Scope

Weather, Disease, Market, Sensor, AI/LLM endpoint와 자동 진단·추천·제어 endpoint는 Core v0.1에서 구현하지 않습니다. 향후 Lab이 승인된 Integration으로 승격되면 독립된 API 계약과 데이터 출처·검증 상태를 추가합니다.
