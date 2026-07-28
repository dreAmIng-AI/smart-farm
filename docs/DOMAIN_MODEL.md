# DOMAIN_MODEL.md

## 1. 목적

농업 현장의 개념을 데이터베이스 테이블보다 먼저 정의합니다.

## 2. 핵심 객체

### User

서비스 사용자입니다. 인증 정보는 Supabase Auth가 관리합니다.

### Farm

사용자가 운영하거나 관리하는 농장 단위입니다.

### FarmMembership

사용자와 농장의 관계 및 권한을 정의합니다.

### CropCycle

한 농장에서 특정 작물을 정식한 시점부터 재배 종료까지 관리하는 작기입니다.

### TaskTemplate

농업 전문가가 검토한 생육단계별 기본 작업 기준입니다.

### FarmTask

특정 농장·작기에 대해 실제 수행해야 하는 작업입니다. 초기 Mission Card의 데이터 원본입니다.

### ActionLog

사용자가 FarmTask를 확인하거나 실행한 결과입니다.

### IssueRecord

작업 수행 중 발견한 문제 또는 이상 상황입니다.

### Attachment

ActionLog 또는 IssueRecord에 연결된 사진 등 파일입니다.

## 3. 관계

```text
User N ─ N Farm           through FarmMembership
Farm 1 ─ N CropCycle
CropCycle 1 ─ N FarmTask
TaskTemplate 1 ─ N FarmTask
FarmTask 1 ─ N ActionLog
FarmTask 1 ─ N IssueRecord
ActionLog 1 ─ N Attachment
IssueRecord 1 ─ N Attachment
IssueRecord 0..1 ─ N Follow-up FarmTask
```

## 4. FarmTask 상태

```text
pending
→ in_progress
→ completed

pending | in_progress
→ issue_reported

pending
→ cancelled
```

초기 상태 값:

- `pending`
- `in_progress`
- `completed`
- `issue_reported`
- `cancelled`

## 5. IssueRecord 상태

- `open`
- `needs_review`
- `resolved`
- `closed_without_action`

## 6. 업무 규칙

1. 종료된 작기에는 새 자동 작업을 생성하지 않습니다.
2. 완료 작업의 기록은 삭제보다 수정 이력을 남기는 방식을 우선합니다.
3. 한 작업에 여러 ActionLog를 허용하되 최종 상태는 FarmTask가 보유합니다.
4. 문제 기록은 농업적 진단 확정이 아니라 사용자의 관찰 사실을 저장합니다.
5. 후속 FarmTask는 원본 IssueRecord를 참조합니다.
6. 초기 Mission Card는 FarmTask의 UI 표현입니다.
7. 외부정보가 없어도 검토된 TaskTemplate으로 핵심 흐름이 작동해야 합니다.

## 7. FarmTask 필수 의미

- 무엇을 해야 하는가
- 왜 해야 하는가
- 언제 해야 하는가
- 우선순위는 무엇인가
- 근거 유형은 무엇인가
- 어떤 결과를 기록해야 하는가
- 전문가 확인이 필요한가

## 8. 외부정보 확장 객체

첫 수직 기능 이후 추가합니다.

### DataSource

공식 데이터 출처와 라이선스 조건입니다.

### ExternalRawData

외부 응답 원본 또는 원본 참조입니다.

### NormalizedContent

서비스 내부 표준 형식으로 변환된 공식정보입니다.

### ApiCallLog

호출 성공·실패·캐시·fallback 기록입니다.
