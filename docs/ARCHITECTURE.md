# Architecture

**Status: CURRENT IMPLEMENTATION CONTRACT**

## 1. 아키텍처 목표

- 작물 독립 Core Platform v0.1의 Work Cycle을 작은 수직 흐름으로 완성합니다.
- Crop Pack의 농업지식과 Core 실행 로직을 분리합니다.
- Labs와 Integrations가 Core의 일정·가용성을 막지 않게 합니다.
- DB·API·타입 계약을 일관되게 유지하고 낮은 초기 운영비용을 유지합니다.

## 2. 상위 구조

```text
Smart Farm Platform
├── Core Platform
│   └── Farm → CropCycle → 계획 → Today → 기록 → Issue → History
├── Crop Packs
│   └── TaskTemplate, Growth Stage, Evidence, Verification Status
├── Labs
│   └── Weather / Disease / Analytics / AI / Sensor / Market / Additional Crops
└── Integrations
    └── 승인되고 운영 가능한 외부 연결
```

이 구조는 책임 경계를 설명하는 문서입니다. 개념을 이유로 빈 폴더, 패키지, Microservice, Event Bus, Queue 또는 미래 기능 전용 인프라를 만들지 않습니다.

## 3. 기술 기준

- Next.js + TypeScript
- Supabase PostgreSQL, Auth, Storage
- Vercel
- 기존 Monorepo 방향 유지
- DB: `snake_case`; TypeScript/API: `camelCase`
- DB 시간: UTC; UI 표시: Asia/Seoul
- Supabase RLS, Secret의 클라이언트 노출 금지

현재 저장소에는 Core v0.1의 계획·Today·결과·문제·사진 첨부·후속·이력을 위한 Next.js 애플리케이션, Supabase migration, 워크스페이스 설정이 있습니다. 구현 범위는 `Email 로그인 → Farm → CropCycle·현재 생육 단계 → TaskTemplate 적용 → FarmTask → 일정 → Today → ActionLog → IssueRecord → 선택적 사진 첨부 → Follow-up FarmTask → History`입니다. 완료·문제 기록은 각각 PostgreSQL RPC로 ActionLog와 FarmTask 상태를 원자적으로 처리하며, 문제 RPC는 연결된 IssueRecord도 함께 생성합니다. 현재 생육 단계는 기존 `crop_cycles.growth_stage`를 권한 있는 사용자만 갱신하며 FarmTask를 자동 생성·재일정하지 않습니다. 사진은 결과와 분리된 Route Handler에서 비공개 Supabase Storage에 저장하고 Attachment 메타데이터를 기록합니다. Follow-up RPC는 원본 IssueRecord의 참조를 보존합니다. `src/proxy.ts`는 Supabase Auth 세션을 갱신해 Route Handler와 RLS가 동일한 로그인 사용자를 확인하도록 합니다. 코드 구조와 도구는 필요한 최소 단위로만 추가하며, 구조적 결정은 ADR에 기록합니다.

## 4. Core Platform v0.1 흐름

```text
Next.js Mobile UI
→ Server Action / Route Handler
→ Core Domain Logic
→ Supabase Repository
→ PostgreSQL / Storage
```

Core Domain Logic은 다음 책임을 가집니다.

- Farm과 CropCycle의 유효성 검사
- CropCycle 현재 생육 단계의 유효성 검사와 권한 있는 갱신
- TaskTemplate을 계획된 FarmTask로 적용
- Today의 오늘·지연 작업 조회
- ActionLog를 통한 결과 기록과 FarmTask 상태 변경
- IssueRecord 상태 변경과 Follow-up FarmTask 생성·연결
- Attachment 파일 검증·비공개 Storage 저장·이력 조회
- 이력 조회

Core는 설향이나 특정 작물 이름으로 로직을 분기하지 않습니다. Crop Pack 데이터가 템플릿과 근거를 제공하고 Core는 이를 실행 흐름에 적용합니다.

## 5. 데이터와 권한

- Farm, CropCycle, TaskTemplate, FarmTask, ActionLog, IssueRecord, Attachment를 우선 재사용합니다.
- 작기 전체 계획은 `CropCycle + TaskTemplate → Scheduled FarmTask[]`로 우선 표현합니다.
- Farm과 사용자 접근은 Supabase Auth 및 RLS로 제한합니다.
- Farmer는 접근 가능한 Farm 데이터만 다루고, Admin의 범위는 승인된 최소 운영 현황으로 제한합니다.
- 사진은 JPEG/PNG/WebP, 파일당 10MB까지 허용하며 파일 시그니처와 MIME type을 함께 검증합니다.
- 사진 저장 실패가 ActionLog의 텍스트 기록 전체를 잃게 하지 않도록 결과 기록 뒤의 별도 요청으로 분리합니다.
- Storage object는 Farm ID와 ActionLog ID 경로를 함께 사용하고, Storage RLS와 Attachment RLS 모두 Farm 접근권한을 확인합니다.

## 6. Crop Pack 경계

Crop Pack은 별도 런타임 서비스가 아니라 작업 템플릿 데이터의 표현 방식입니다. Strawberry / Seolhyang은 v0.1의 첫 Fixture와 Reference Crop이며, Core에 `strawberry_tasks` 또는 설향 전용 서비스·테이블을 추가하지 않습니다.

## 7. Labs와 Integrations

Labs는 Core v0.1 바깥에서 독립적으로 실험합니다. Weather, Disease, Analytics, AI, Sensor, Market, Additional Crop Pack은 Lab에서 데이터 안정성, 사용자 가치, 안전성, 비용, 운영 책임을 확인한 뒤에만 Integration 또는 Core 확장을 제안할 수 있습니다.

외부 시스템을 도입할 때만 아래 경계를 검토합니다.

```text
External API → Server / Integration Layer → Adapter → Normalizer
             → optional cache or raw store → approved Core use
```

외부 API를 Client에서 직접 호출하지 않으며, 외부 장애가 Core 작업 기록을 막아서는 안 됩니다.

## 8. 실패 처리

- DB 실패: 사용자가 재시도할 수 있는 상태를 제공하고 중복 제출을 방지합니다.
- Storage 실패: 결과 기록과 파일 업로드를 분리합니다.
- Lab/Integration 실패: Core는 검증된 Template과 기존 기록만으로 계속 동작합니다.
- 데이터 또는 근거 부족: 자동 판단을 만들지 않고 `draft`, 보류 또는 검토 필요 상태를 사용합니다.

## 9. ADR

- [ADR-001](adr/ADR-001-initial-architecture.md)은 초기 스택과 Monorepo 방향을 유지합니다.
- 패키지 관리자, 테스트 도구, Supabase 구성, 실제 Integration 방식은 구현 필요성이 생길 때 ADR로 결정합니다.
