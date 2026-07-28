# ARCHITECTURE.md

## 1. 아키텍처 목표

- 첫 수직 기능을 빠르게 완성한다.
- 팀원이 작은 기능 단위로 독립 작업할 수 있다.
- DB·API·타입 계약을 일관되게 관리한다.
- 낮은 초기 운영비용을 유지한다.
- 외부정보와 AI를 이후 단계에서 분리 확장할 수 있다.

## 2. 확정 기술 스택

- Next.js
- TypeScript
- Supabase Auth
- Supabase PostgreSQL
- Supabase Storage
- Vercel
- Monorepo

세부 버전과 패키지 관리자는 `TBD`이며 기술 통합 책임자가 ADR로 확정합니다.

## 3. 목표 저장소 구조

```text
smart-farm/
├── AGENTS.md
├── README.md
├── apps/
│   └── web/
├── packages/
│   ├── contracts/
│   ├── domain/
│   └── shared/
├── services/
│   └── integrations/
├── supabase/
│   ├── migrations/
│   └── seed/
├── tests/
│   ├── integration/
│   └── fixtures/
├── docs/
├── project/
└── .github/
```

초기 구현에서 불필요한 빈 패키지를 모두 만들 필요는 없습니다. 실제 책임이 생길 때 추가합니다.

## 4. 첫 수직 기능 구성

```text
Next.js Mobile UI
→ Server Action / Route Handler
→ Domain Service
→ Supabase Repository
→ PostgreSQL / Storage
```

### UI

- 농장 등록
- 작기 등록
- 오늘의 작업
- 작업 결과 기록
- 이력

### Domain Service

- 작기 유효성 검사
- TaskTemplate 선택
- 오늘의 FarmTask 생성
- 상태 변경
- 후속 작업 생성

### Persistence

- 농장·작기
- 작업 템플릿
- 작업
- ActionLog
- IssueRecord
- Attachment

## 5. 외부정보 확장 구조

첫 수직 기능 완료 후 적용합니다.

```text
External API
→ Adapter
→ Normalizer
→ Cache / Raw Store
→ Domain Rule
→ FarmTask 근거
```

초기 Adapter 후보:

- WeatherAdapter
- FarmingGuideAdapter

NCPMS, KAMIS, Sensor Adapter는 이후 단계입니다.

## 6. 외부 API 원칙

- Client에서 직접 호출 금지
- API Key 서버 보관
- 응답 원본과 정규화 데이터 분리
- 캐시 우선
- 장애 시 최근 성공 데이터 또는 기능 비활성화
- 출처·갱신일·라이선스 표시
- 외부 API 실패가 핵심 작업 기록 기능을 막지 않음

## 7. 권한

- Farmer: 자신이 접근 가능한 농장 데이터
- Admin: 허용된 농가의 최소 운영 현황
- Supabase RLS 적용
- Service Role Key는 서버 전용

## 8. 환경

- local
- preview/test
- production

각 환경의 Supabase와 Secret을 분리합니다.

## 9. 실패 처리

### Database Failure

- 사용자에게 재시도 상태 표시
- 중복 제출 방지 키 검토
- 실패 로그 기록

### Storage Failure

- 작업 결과 텍스트 저장과 사진 업로드를 분리
- 사진 실패 시 기록 전체를 잃지 않음

### External API Failure

- 캐시 사용
- 마지막 갱신일 표시
- 작업 근거가 없으면 자동 판단을 만들지 않음

### AI Failure

- 규칙 기반 결과 유지
- 판단 보류 또는 추가 정보 요청

## 10. 주요 결정

- ADR-001: 초기 스택과 Monorepo
- 이후 ADR: 패키지 관리자, 테스트 도구, Supabase 구조, 외부 Adapter 방식
