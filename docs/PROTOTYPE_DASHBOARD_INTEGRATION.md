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
| Today/weekly work | `FarmTask` 일정 + Today 조회 | 기존 API와 화면을 재사용 |
| Work completion and notes | `ActionLog` | 기존 결과 기록을 재사용 |
| Issue and follow-up | `IssueRecord` + Follow-up `FarmTask` | 기존 문제·재확인 흐름을 재사용 |
| Image evidence | `Attachment` | 기존 비공개 Storage/RLS 흐름을 재사용 |
| Calendar/WBS/repeat/trigger | 현재 `CropCycle → TaskTemplate → FarmTask[]` | 사용자 검증 후 별도 작업으로 검토 |
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

## Follow-up Candidates

다음은 각각 독립 Issue/PR 및 사용자 검증이 필요한 후보이다.

1. 사용자 인터뷰를 바탕으로 작업 목록의 정보 밀도와 모바일 입력 흐름 개선
2. 작업 영역/운영 유형을 추가해야 하는지 Domain 검토
3. 캘린더 또는 일정 보기의 최소 UX 개선
4. 외부 데이터 Source Review 후 Weather/Market Lab을 Core와 분리해 실험
5. Crop Pack 검증 데이터가 확보된 뒤 생육 단계 선택 UX 개선

## Non-goals

- `ActionLog`, `IssueRecord`, `FarmTask` 등 기존 Domain 명칭 변경
- 별도의 `FarmPlan` 테이블 생성
- Weather, Disease, Sensor, Market, AI, 자동 제어, 반복 작업 엔진 구현
- 프로토타입의 public RLS 정책 또는 인증 구조 도입
