# AGENTS.md

이 파일은 이 저장소에서 작업하는 사람과 AI 코딩 도구가 반드시 따라야 하는 공통 규칙입니다.

## 1. 프로젝트 목적

이 프로젝트는 설향 딸기 시설재배 농가가 오늘의 농작업을 확인하고, 실행 결과와 문제를 기록하며, 후속 작업까지 연결할 수 있도록 하는 농작업 실행관리 서비스입니다.

현재 우선순위는 **정보를 많이 제공하는 것**이 아니라 다음 흐름을 실제로 작동하게 만드는 것입니다.

```text
농장·작기 등록 → 오늘의 작업 → 완료·문제 기록 → 이력 → 후속 작업
```

## 2. 작업 전 필수 확인

작업을 시작하기 전에 다음 순서로 읽습니다.

1. `README.md`
2. `docs/PRODUCT.md`
3. `docs/DOMAIN_MODEL.md`
4. `docs/ARCHITECTURE.md`
5. 관련 Issue 또는 `project/tasks/` Task 문서
6. 수정 대상 폴더의 하위 `AGENTS.md`가 있다면 해당 파일

구두 요청이나 한 문장의 포괄적 지시만으로 개발을 시작하지 않습니다.

## 3. 현재 MVP 범위

허용되는 핵심 기능:

- 농장 등록
- 작기 등록
- 규칙 기반 오늘의 작업 생성
- 작업 확인
- 완료·문제 기록
- 사진·짧은 메모
- 작업 이력
- 후속 확인 작업

현재 범위 밖:

- 모든 농업정보 통합
- 범용 농업 챗봇
- 병해충 확정 진단
- 농약 자동 처방
- 시설 자동제어
- 전체 농장 ERP
- 모든 작물 지원
- 복잡한 수익 예측
- 센서 자동연동
- 가격·지원사업·토양정보

## 4. 기술 규칙

- Framework: Next.js
- Language: TypeScript
- Database/Auth/Storage: Supabase
- Deployment: Vercel
- DB field: `snake_case`
- TypeScript/API JSON: `camelCase`
- DateTime storage: UTC
- Display timezone: Asia/Seoul
- 외부 API는 서버 계층 또는 Integration Layer에서만 호출합니다.
- API Key와 Secret은 환경변수로 관리하며 코드·로그·PR에 노출하지 않습니다.
- 공통 타입과 계약은 한 위치에서 관리합니다.
- DB 변경은 migration과 문서 변경을 함께 제출합니다.

## 5. 도메인 규칙

- 초기 Mission Card는 별도 핵심 객체가 아니라 `FarmTask`의 화면 표현입니다.
- 작업 실행 결과는 `ActionLog`에 저장합니다.
- 문제는 `IssueRecord`로 남기고 필요하면 후속 `FarmTask`를 생성합니다.
- 공식정보, 농장 기록, 서비스 분석 결과를 같은 데이터처럼 섞지 않습니다.
- 농업적 의미가 있는 작업 템플릿과 규칙은 농업 도메인 검토를 받아야 합니다.

## 6. 금지사항

- Task에 없는 기능 추가
- 관련 없는 리팩터링
- 승인 없는 라이브러리 추가
- 승인 없는 DB·API 계약 변경
- 테스트 삭제 또는 약화
- 프런트엔드의 공공 API 직접 호출
- Secret 하드코딩
- 출처 없는 농업 수치 또는 작업 생성
- 센서 값이 없는데 농장 상태 단정
- 병명 확정 또는 농약 자동 처방
- 검증되지 않은 생산성·수익성 표현

## 7. Task 단위

하나의 Task는 가능하면 1~2일 안에 끝낼 수 있는 크기로 나눕니다.

Task에는 반드시 다음이 있어야 합니다.

- Goal
- Background
- References
- Scope
- Out of Scope
- Allowed Files
- Restricted Files
- Input
- Output
- Acceptance Criteria
- Required Tests
- Handoff

## 8. Branch와 PR

- `main`에 직접 push하지 않습니다. 저장소 최초 초기화 이후부터 적용합니다.
- 브랜치 예시: `feat/12-create-farm-api`, `fix/27-task-date-validation`
- 한 Issue = 한 Branch = 한 PR
- 일반 PR: 1명 승인
- 고위험 PR: 기술 통합 책임자를 포함한 2명 승인
- 고위험 변경: DB migration, API 계약, 인증·권한, 공통 패키지, 배포 설정, 농작업 핵심 규칙
- Merge: Squash and merge

## 9. 완료 전 검증

프로젝트 스크립트가 준비되면 최소 다음을 실행합니다.

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

통합 테스트와 E2E가 추가되면 관련 명령도 반드시 실행합니다.

## 10. 작업 결과 보고 형식

작업 종료 시 다음 형식으로 보고합니다.

```text
변경 목적:
변경 파일:
구현 내용:
실행한 테스트:
테스트 결과:
계약 변경 여부:
남은 위험:
사람이 확인할 부분:
후속 Task:
```
