# API_CONTRACT.md

## 1. 원칙

- 실제 계약의 단일 원본은 코드 스키마와 테스트입니다.
- 이 문서는 의도, Endpoint, 오류 코드, 예시를 설명합니다.
- API JSON은 camelCase를 사용합니다.
- DateTime은 ISO 8601 UTC를 반환합니다.
- 인증은 Supabase 세션을 기준으로 합니다.

## 2. 공통 성공 구조

단일 객체는 과도한 envelope 없이 반환할 수 있습니다. 목록에는 metadata를 포함합니다.

```json
{
  "items": [],
  "meta": {
    "count": 0
  }
}
```

## 3. 공통 오류 구조

```json
{
  "error": {
    "code": "FARM_NOT_FOUND",
    "message": "Farm not found",
    "requestId": "req_123"
  }
}
```

## 4. 초기 Endpoint

### POST /api/farms

농장을 생성합니다.

Request:

```json
{
  "name": "김제 설향 농장",
  "regionCode": "KR-45-210",
  "cultivationEnvironment": "facility",
  "cultivationMethod": "soil",
  "sensorUsage": false
}
```

Response: `201`

```json
{
  "id": "uuid",
  "name": "김제 설향 농장",
  "regionCode": "KR-45-210"
}
```

Errors: `VALIDATION_ERROR`, `UNAUTHORIZED`

### POST /api/farms/{farmId}/crop-cycles

설향 작기를 등록합니다.

Request:

```json
{
  "cropCode": "strawberry",
  "cultivar": "seolhyang",
  "transplantDate": "2026-09-10",
  "growthStage": "flowering"
}
```

Errors: `FARM_NOT_FOUND`, `FARM_ACCESS_DENIED`, `ACTIVE_CROP_CYCLE_EXISTS`

### POST /api/crop-cycles/{cropCycleId}/tasks/generate

검토된 TaskTemplate으로 오늘의 작업을 생성합니다.

Response:

```json
{
  "generatedCount": 3,
  "taskIds": ["uuid-1", "uuid-2", "uuid-3"]
}
```

동일 날짜·템플릿 중복 생성을 방지해야 합니다.

### GET /api/farms/{farmId}/tasks/today

오늘의 작업을 조회합니다.

```json
{
  "items": [
    {
      "id": "uuid",
      "title": "꽃과 잎의 결로 여부 확인",
      "taskType": "environment_check",
      "reason": "개화기 기본 확인 작업",
      "priority": "high",
      "recommendedAt": "2026-07-28T22:00:00Z",
      "evidence": [
        {
          "type": "expert_template",
          "label": "설향 개화기 작업 기준 v1"
        }
      ],
      "status": "pending",
      "resultRequired": true,
      "safetyLevel": "field_check"
    }
  ],
  "meta": {
    "count": 1
  }
}
```

### PATCH /api/tasks/{taskId}/status

작업 상태를 변경합니다.

```json
{
  "status": "in_progress"
}
```

완료 또는 문제 상태는 ActionLog 생성 Endpoint와 트랜잭션 처리하는 방식을 우선 검토합니다.

### POST /api/tasks/{taskId}/action-logs

작업 결과를 기록합니다.

```json
{
  "actionType": "completed",
  "resultCode": "normal",
  "note": "결로 없음",
  "performedAt": "2026-07-29T00:10:00Z"
}
```

문제 결과 예시:

```json
{
  "actionType": "issue_reported",
  "resultCode": "condensation_found",
  "note": "꽃 일부에 물방울 확인",
  "performedAt": "2026-07-29T00:10:00Z",
  "issue": {
    "observedSymptom": "꽃 일부에 물방울 확인",
    "severity": "unknown"
  }
}
```

### POST /api/action-logs/{actionLogId}/attachments

사진 업로드를 위한 서명 URL 또는 서버 업로드 절차를 제공합니다.

사진 업로드 실패가 ActionLog 저장을 취소하지 않도록 분리합니다.

### GET /api/farms/{farmId}/history

작업과 기록 이력을 조회합니다.

Query:

- from
- to
- status
- cursor

## 5. 오류 코드

- `UNAUTHORIZED`
- `FARM_ACCESS_DENIED`
- `FARM_NOT_FOUND`
- `CROP_CYCLE_NOT_FOUND`
- `TASK_NOT_FOUND`
- `ACTIVE_CROP_CYCLE_EXISTS`
- `INVALID_STATUS_TRANSITION`
- `DUPLICATE_TASK_GENERATION`
- `VALIDATION_ERROR`
- `STORAGE_UPLOAD_FAILED`
- `INTERNAL_ERROR`

## 6. 외부정보 Endpoint

첫 수직 기능 완료 전에는 구현하지 않습니다.

이후 후보:

- `GET /api/farms/{farmId}/weather`
- `GET /api/farms/{farmId}/official-guides`

외부 API 원본 응답을 그대로 Client에 노출하지 않습니다.
