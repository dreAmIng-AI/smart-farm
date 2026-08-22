# Prototype Dashboard Integration

## Purpose

팀 프로토타입 [`YIsungjoon/dreaming_agri`](https://github.com/YIsungjoon/dreaming_agri)의 운영 대시보드 흐름을 검토하고, dreAmIng Smart Farm Core Platform에 안전하게 흡수할 범위를 기록한다.

이 문서는 프로토타입 코드를 복사하거나 현재 Core의 모델을 대체하기 위한 설계가 아니다. 현재 Domain과 RLS 경계를 보존하면서 검증된 사용자 흐름을 작은 단위로 도입하기 위한 기준이다.

## Audit Summary

프로토타입은 SvelteKit 기반이며, 다음의 운영 흐름을 제공한다.

- 농장과 작물의 현재 상태 요약
- 오늘/이번 주 작업과 작업 완료·문제 기록
- 작업 이력과 후속 작업
- 기상·병해충·시세 요약
- 프로젝트/WBS, 반복 일정, 트리거 규칙, AI/RAG 실험

그중 첫 세 항목은 현재 Core Platform의 Farm, CropCycle, FarmTask, ActionLog, IssueRecord, Attachment, Follow-up FarmTask와 직접 연결된다. 반면 외부 기상·병해충·시세와 AI 기능은 Data Source, 안전성, 실패 처리, 비용, 운영 책임이 검증되기 전까지 Core가 아닌 Lab/Integration 범위다.

프로토타입의 초기 migration에는 public read/write RLS 정책이 포함되어 있다. 이를 현재 서비스로 가져오지 않는다. Smart Farm의 기존 Farm membership 기반 RLS를 권한 경계로 유지한다.

## Feature Mapping

| Prototype capability | Smart Farm reuse | Decision |
| --- | --- | --- |
| Farm overview | `Farm` + 선택된 `CropCycle` | 운영 현황 요약으로 도입 |
| Today/weekly work | `FarmTask` 일정 + Today 조회 | 주간 작업 운영 보기로 도입 |
| Direct task entry | `FarmTask` with `sourceType: manual` | owner/admin 직접 등록으로 도입 |
| Work completion and notes | `ActionLog` | 기존 결과 기록을 재사용 |
| Issue and follow-up | `IssueRecord` + Follow-up `FarmTask` | 기존 문제·재확인 흐름을 재사용 |
| Image evidence | `Attachment` | 기존 비공개 Storage/RLS 흐름을 재사용 |
| Calendar | 현재 `CropCycle → TaskTemplate → FarmTask[]` | 주간 보드와 월간 달력으로 도입 |
| WBS/repeat/trigger | 현재 `CropCycle → TaskTemplate → FarmTask[]` | 새 Domain 검토 후 별도 작업 |
| Weather/pest/market | Lab/Integration | 이번 범위에서 제외 |
| AI/RAG/diagnosis | Lab | 이번 범위에서 제외 |

## First Integration: Operations Dashboard

운영 현황은 선택된 Farm과 CropCycle의 실제 데이터만 사용한다.

- 오늘 작업 수와 지연 작업 수
- 열림/검토 필요 IssueRecord 수와 심각도 높음 수
- 오늘 완료된 FarmTask 수
- 앞으로 예정된 최대 3개의 활성 FarmTask
- 기존 Farm 정보 및 Plan/Today 화면으로 이동하는 링크

따라서 migration, 새 API, 외부 API, 비밀값, crop-specific branch는 필요하지 않다. 화면은 분석 대시보드나 농업 처방이 아니라 현재 Work Cycle의 진입점이다.

## Second Integration: Weekly Work View

선택한 CropCycle의 기존 `FarmTask` 일정을 서울 시간 기준 월요일~일요일 보드로 표시한다.

- 이전 주·이번 주·다음 주 이동
- 상태와 우선순위, 문제 재확인 후속 작업 여부 표시
- 작업 카드 선택 시 기존 Task Detail 및 결과 기록 흐름 재사용

이 기능은 새로운 계획 모델이나 데이터를 생성하지 않는다. 기존 Schedule 조회의 결과만 읽으므로 migration, API, RLS, 외부 데이터 Source는 추가하지 않는다.

## Third Integration: Monthly Work Calendar

선택한 CropCycle의 저장된 `FarmTask`를 서울 시간 기준 일요일 시작 6주 달력으로 표시한다.

- 이전 달·이번 달·다음 달 이동
- 날짜별 작업 수와 상태가 보이는 일정 분포
- 날짜를 누르면 그날의 모든 작업을 열고, 작업 선택 시 기존 상세·결과 기록 흐름 재사용

기존 Schedule 조회 결과만 사용한다. 따라서 migration, API, RLS, 외부 데이터 Source 변경은 없다.

## Fourth Integration: Direct Task Entry

프로토타입의 새 작업 등록 흐름을 기존 `FarmTask`로 연결한다.

- owner/admin만 진행 중 CropCycle에 제목·이유·예정일·우선순위로 작업을 등록
- 기존 `farm_tasks.source_type = manual`과 manager INSERT RLS 재사용
- 직접 등록 작업은 `verificationStatus: draft`로 표시하고 Crop Pack 처방과 구분
- Schedule, Today, 주간 보드, 월간 달력, 상세·결과 기록이 같은 작업을 즉시 사용

새 Table, migration, 별도 계획 Entity는 추가하지 않는다.

## Follow-up Candidates

다음은 각각 독립 Issue/PR 및 사용자 검증이 필요한 후보이다.

1. 사용자 인터뷰를 바탕으로 작업 목록의 정보 밀도와 모바일 입력 흐름 개선
2. 작업 영역/운영 유형을 추가해야 하는지 Domain 검토
3. WBS·반복·트리거가 실제 운영에 필요한지 Domain 검토
4. 외부 데이터 Source Review 후 Weather/Market Lab을 Core와 분리해 실험
5. Crop Pack 검증 데이터가 확보된 뒤 생육 단계 선택 UX 개선

## Non-goals

- `ActionLog`, `IssueRecord`, `FarmTask` 등 기존 Domain 명칭 변경
- 별도의 `FarmPlan` 테이블 생성
- Weather, Disease, Sensor, Market, AI, 자동 제어, 반복 작업 엔진 구현
- 프로토타입의 public RLS 정책 또는 인증 구조 도입
