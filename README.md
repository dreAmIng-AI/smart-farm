# dreAmIng Smart Farm

설향 딸기 시설재배 농가를 위한 **농작업 실행관리 서비스**입니다.

농업인이 농장과 작기 정보를 등록하면 현재 생육단계와 농업 전문가가 검토한 작업 기준을 바탕으로 오늘 해야 할 작업을 제시하고, 완료·문제·사진·메모를 기록해 후속 작업과 이력으로 연결합니다.

## 현재 개발 단계

- 상태: `Stage 0 — 개발 계약 및 저장소 초기화`
- 초기 사용자: 설향 딸기 시설재배 농업인
- 초기 화면: 모바일 우선
- 초기 판단 방식: 규칙 기반
- 첫 AI 기능: 작업 기록 요약, 누락 정보 질문, 확인 작업 제안

## 제품 핵심 흐름

```text
농장 등록
→ 작기 등록
→ 오늘의 작업 생성
→ 작업 확인
→ 완료 또는 문제 기록
→ 사진·메모 저장
→ 작업 이력 조회
→ 문제 발생 시 후속 작업 생성
```

## 첫 번째 수직 기능

첫 수직 기능은 다음 조건을 모두 충족해야 완료로 인정합니다.

- 농장과 작기 정보를 저장할 수 있다.
- 설향 딸기 생육단계에 맞는 오늘의 작업이 생성된다.
- 작업 완료 또는 문제 발생 결과가 저장된다.
- 사진 또는 짧은 메모를 남길 수 있다.
- 작업 이력에서 결과를 다시 확인할 수 있다.
- 문제 발생 시 후속 확인 작업을 생성할 수 있다.
- lint, typecheck, test, build, CI를 통과한다.
- 다른 팀원이 문서만 보고 로컬 실행을 재현할 수 있다.

## 확정 기술 기준

- Web: Next.js + TypeScript
- Database/Auth/Storage: Supabase
- Deployment: Vercel
- Repository: Monorepo
- Time: UTC 저장, Asia/Seoul 표시
- DB naming: snake_case
- TypeScript/API JSON: camelCase
- Merge: Squash and merge

## 문서 안내

### 합의 문서

- [바이브 코딩 협업 개발 운영안](docs/agreements/VIBE_CODING_COLLABORATION_AGREEMENT.md)
- [스마트농업 개발 착수 의사결정서](docs/agreements/SMART_AGRICULTURE_DEVELOPMENT_START_AGREEMENT.md)

### 개발 계약

- [제품 정의](docs/PRODUCT.md)
- [도메인 모델](docs/DOMAIN_MODEL.md)
- [아키텍처](docs/ARCHITECTURE.md)
- [데이터 사전](docs/DATA_DICTIONARY.md)
- [API 계약](docs/API_CONTRACT.md)
- [AI 안전 기준](docs/AI_SAFETY.md)
- [외부 데이터 검토 기준](docs/DATA_SOURCE_REVIEW.md)
- [개발 로드맵](docs/DEVELOPMENT_ROADMAP.md)
- [미정 사항](docs/TEAM_TBD.md)

### 협업 운영

- [바이브코딩 활용 개발 규칙](AGENTS.md)
- [Task 템플릿](project/tasks/TASK_TEMPLATE.md)
- [초기 2주 Task](project/INITIAL_TASKS.md)
- [PR 템플릿](.github/pull_request_template.md)

## 개발 원칙

1. 제품 계약을 먼저 수정하고 코드를 수정합니다.
2. 역할별 장기 브랜치가 아니라 작은 기능 단위로 작업합니다.
3. 한 Issue는 한 Branch와 한 PR로 끝냅니다.
4. 외부 API를 프런트엔드에서 직접 호출하지 않습니다.
5. 공식정보, 농장 기록, 서비스 분석 결과를 구분합니다.
6. 근거 없는 농작업이나 AI 판단을 생성하지 않습니다.
7. 첫 수직 기능이 완료되기 전에는 외부 데이터, 센서, 가격, 범용 AI 기능을 확장하지 않습니다.

## 현재 미정

담당자 이름, GitHub 사용자명, 첫 검증 농가·기관, 첫 수직 기능 목표일은 [TEAM_TBD.md](docs/TEAM_TBD.md)에서 관리합니다.
