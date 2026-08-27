# dreAmIng Smart Farm Platform

dreAmIng Smart Farm은 농업인이 **오늘 해야 할 일, 확인할 사항, 현재 작기와 신뢰할 수 있는 참고정보**를 빠르게 파악하고, 농작업 기록을 다음 행동과 이력으로 연결하도록 돕는 농장 운영 플랫폼입니다.

## 지금 무엇을 개발하나요?

현재 구현 기반은 **Core Platform v0.1**이며, 다음 목표는 이를 보존하는 **Platform v0.2 Real Data Pilot + Senior-Friendly UX**입니다. v0.1의 실제 Farm·작기·작업·기록 흐름을 폐기하거나 새로 설계하지 않습니다.

```text
Farm → CropCycle → 작업계획 → Today → FarmTask 실행
     → ActionLog / IssueRecord → 선택적 사진 첨부 → Follow-up FarmTask → History
     ↘ FarmArea → optional CropCycle / FarmTask
     ↘ Observation → IssueRecord / Measurement / 실제 공공 참고정보 (v0.2 확장)
```

## 플랫폼 구조

| 영역 | 역할 | 상태 |
|---|---|---|
| Operations Core | 작물과 무관한 농작업 실행관리 기반 | v0.1 구현됨, v0.2 FarmArea work context·Observation·Measurement 구현됨 |
| Baseline Modules | 실제 Weather, Disease/Pest, Crop Information, Market Information | 기상청 Weather, 전국 단위 병해충 발생정보, Crop Pack 기반 농사로 작물별 참고자료 구현됨; Market은 순차 도입 |
| Crop Packs | 작물·품종별 생육단계, 작업 템플릿, 근거와 검증 상태 | 설향 딸기가 첫 Reference Crop; Core에 작물별 분기 없음 |
| Labs | Sensor, AI, Analytics, Automation, Prediction 등 고도화 실험 | Baseline의 선행 조건이 아니며 독립 유지 |

설향은 제품 범위가 아니라 **Core Platform v0.1을 현실적인 농업 사례로 검증하는 첫 Reference Crop**입니다. Core 코드와 DB에 `strawberry` 또는 `seolhyang` 전용 분기를 만들지 않습니다.

## 무엇을 먼저 읽어야 하나요?

1. [제품 방향과 범위 v0.2](docs/PRODUCT_PLAN.md)
2. [Platform v0.2 PRD](docs/PRD_PLATFORM_V0.2.md)
3. [Core Platform v0.1 PRD — historical](docs/PRD_CORE_V0.1.md)
4. [개발·협업 규칙](AGENTS.md)
5. 구현·확장 계약: [도메인](docs/DOMAIN_MODEL.md), [아키텍처](docs/ARCHITECTURE.md), [데이터](docs/DATA_DICTIONARY.md), [API](docs/API_CONTRACT.md)
6. [Integration Contract](docs/INTEGRATION_CONTRACT.md), [공공데이터 Source Register](docs/PUBLIC_DATA_SOURCES.md), [UX 가이드](docs/UX_GUIDELINES.md)
7. [Pilot 검증 가이드](docs/PILOT_VALIDATION_GUIDE.md)

v0.2 문서가 Pilot 개발의 기준입니다. 과거 v0.1 문서와 합의는 삭제하지 않고 Historical로 보존합니다. 아직 구현되지 않은 v0.2 계약은 문서에서 `planned`로 표시하며, 구현으로 오해하지 않습니다.

## 현재 구현된 Operations Core

- owner의 Farm 생성, 공유 Farm 목록 선택, owner/admin의 기본정보 수정과 CropCycle 생성·선택
- Farm 구성원 초대 링크 생성·수락과 owner/admin/farmer 역할 관리
- CropCycle의 현재 생육 단계 생성·변경과 완료·취소 처리
- Crop Pack의 TaskTemplate으로 작기 전체 예정 FarmTask 생성
- owner/admin의 직접 FarmTask 등록과 예정 FarmTask 취소
- owner/admin의 FarmTask 담당자 배정·해제와 팀 작업 조율
- 전체 일정과 Today의 오늘·지연 작업 확인
- FarmTask 상세에서 작업 이유, 예정 시각, 우선순위, 근거와 검증 상태 확인
- 작업 시작·완료·문제 있음·확인하지 못함을 ActionLog로 기록
- 작업 또는 Observation에서 IssueRecord를 기록하고, 작기 문맥이 있을 때 Follow-up FarmTask 연결
- IssueRecord 상태 변경 및 해결 시각 기록
- 결과 또는 문제 기록에 선택적 사진 첨부
- 작업·문제 이력 조회

## v0.2 Pilot에서 추가할 것

- 첫 화면을 Today 중심으로 전환하고, 사용자에게 Farm·CropCycle 같은 내부 용어 대신 농장·현재 작기·오늘 할 일을 사용
- Farm 아래의 실제 관리 공간(FarmArea), FarmTask 없이 남기는 사실 기반 Observation과 필요한 경우에만 쓰는 수동 수치 Measurement 구현
- 기상청 공식 현재 실황·단기예보 Weather 카드와 위치별 최신/마지막 정상 데이터 표시
- 전국 단위 농사로 병해충 발생정보와 Crop Pack 기반 작물별 참고자료 카드, 이후 공식 Market Information 카드
- 출처·기준시점·신선도 표시와 마지막 정상 데이터 fallback

외부 API 키가 없거나 provider가 실패하면 가상의 수치를 만들지 않습니다. 농작업 기록은 계속 사용하고, 해당 정보 카드만 이해하기 쉬운 데이터 없음 또는 마지막 업데이트 상태를 표시합니다.

## 팀원은 어디에 기여할 수 있나요?

- **Core Owner**: Core Platform의 계약과 지속적인 개발을 책임집니다.
- **Contributor**: Crop Pack, Lab 또는 승인된 작은 기능을 독립적으로 작업합니다.
- **Reviewer**: 농업·데이터·기술 영역을 검토합니다.

Contributor 또는 Lab의 일정이 지연되어도 Core Platform 개발은 멈추지 않습니다. 모든 변경은 `1 Issue = 1 Branch = 1 PR` 원칙을 따릅니다.

## 이전 기준과 달라진 점

| 이전 | 현재 |
|---|---|
| 설향 중심 서비스 | 작물 독립 Core Platform |
| 설향 = 제품 범위 | 설향 = Reference Crop |
| 오늘의 작업 중심 | 작기 계획 → 오늘 → 실행 → 기록 → 문제 → 후속 → 이력 |
| 기능 순차 추가 | Core Track + Parallel Labs |
| 팀 전체 공동 진행 의존 | Core Owner + Contributor + Reviewer / Non-blocking |

## 문서 상태

- v0.2 기준: [PRODUCT_PLAN.md](docs/PRODUCT_PLAN.md), [PRD_PLATFORM_V0.2.md](docs/PRD_PLATFORM_V0.2.md), [UX_GUIDELINES.md](docs/UX_GUIDELINES.md), [AGENTS.md](AGENTS.md)
- 구현·확장 계약: [DOMAIN_MODEL.md](docs/DOMAIN_MODEL.md), [ARCHITECTURE.md](docs/ARCHITECTURE.md), [DATA_DICTIONARY.md](docs/DATA_DICTIONARY.md), [API_CONTRACT.md](docs/API_CONTRACT.md), [INTEGRATION_CONTRACT.md](docs/INTEGRATION_CONTRACT.md)
- Pilot 준비: [PUBLIC_DATA_SOURCES.md](docs/PUBLIC_DATA_SOURCES.md), [PILOT_VALIDATION_GUIDE.md](docs/PILOT_VALIDATION_GUIDE.md)
- Historical: [PRD_CORE_V0.1.md](docs/PRD_CORE_V0.1.md), [USER_VALIDATION_GUIDE.md](project/USER_VALIDATION_GUIDE.md)
- 과거 방향: [PRODUCT.md](docs/PRODUCT.md), [개발 착수 합의](docs/agreements/SMART_AGRICULTURE_DEVELOPMENT_START_AGREEMENT.md)

## 기술 기준

- Next.js + TypeScript
- Supabase PostgreSQL, Auth, Storage
- Vercel, 기존 Monorepo 방향 유지
- GitHub Actions는 모든 PR과 `main` 병합에서 `lint`, `typecheck`, `test`, `build`를 실행합니다.
- DB는 `snake_case`, TypeScript/API는 `camelCase`
- DB 시간은 UTC, UI 표시는 Asia/Seoul
- RLS 적용, Secret의 클라이언트 노출 금지

## Farm 협업

Farm owner만 새 Farm을 만들 수 있습니다. owner는 admin과 farmer를 초대하고, owner 역할을 제외한 구성원 역할을 변경하거나 제거할 수 있습니다. Farm admin은 배정된 Farm의 기본정보·작기·일정을 관리하고 farmer만 초대·제거할 수 있습니다. farmer는 초대받은 Farm의 일정과 Today를 보고 작업 결과·관찰한 문제·허용된 사진을 기록하지만 Farm 생성, 작기·일정·문제 상태 변경, 구성원 관리는 할 수 없습니다. 자동 이메일은 보내지 않습니다. 생성된 링크를 직접 전달하면, 기존 사용자는 동일한 이메일로 로그인하고 신규 사용자는 링크 안에서 본인 비밀번호로 계정을 설정해 7일 안에 수락할 수 있습니다. 관리자는 구성원의 비밀번호를 보거나 저장하지 않습니다. Supabase Email confirmation을 켠 환경에서는 인증을 완료한 뒤 같은 초대 링크를 다시 열어 수락합니다. 초대 토큰 원문은 저장하지 않으므로, 분실한 링크는 권한이 있는 사용자가 새로 발급하며 이때 이전 링크는 즉시 무효화됩니다.

## 현재 Vertical Slice 실행

1. `.env.example`을 `.env.local`로 복사하고 Supabase URL과 anon key를 설정합니다.
2. `supabase/migrations/`의 migration을 파일명 순서대로 대상 Supabase 프로젝트에 적용합니다.
3. `pnpm dev`를 실행하고 `http://localhost:3000`에서 등록한 이메일로 로그인합니다. 신규 팀원은 받은 초대 링크에서 계정을 직접 설정할 수 있습니다.

포함 흐름은 `로그인 → owner의 Farm 생성 또는 공유 Farm 선택 → owner/admin의 재배 구역 등록 → owner/admin의 CropCycle 생성·선택·주 재배 구역·현재 생육 단계 변경·종료 → Draft TaskTemplate 적용 또는 직접 FarmTask 등록·대상 재배 구역·담당자 배정 → 일정 → Today → 모든 구성원의 작업 시작·결과 기록 → IssueRecord → 선택적 사진 첨부 → owner/admin의 Follow-up FarmTask → 이력`입니다. 재배 구역은 Farm 아래의 단순한 이름·메모이며 지도·상세 주소·GPS를 저장하지 않습니다. CropCycle의 주 재배 구역은 이후 새 Template 작업에 상속되며, 기존 일정은 자동으로 재배정하지 않습니다. 날씨는 owner/admin이 농장에 있는 기기에서 명시적으로 확인한 위치의 이름과 약 5km 기상청 격자만 사용하며, 원래 GPS 좌표는 저장하거나 서버에 전송하지 않습니다. Today의 농사로 병해충 발생정보는 전국 단위 공식 발간물이며, 작물별 참고자료는 Crop Pack에 등록된 공식 작물명과 정확히 일치한 원문 링크만 보여 줍니다. 두 정보 모두 농장 진단이나 방제 지시가 아닙니다. 저장된 Farm과 CropCycle을 선택하면 기존 일정, Today, 이력을 다시 불러오며 작업 계획은 자동으로 다시 생성하지 않습니다. 작기는 완료 또는 취소 상태로 종료할 수 있고, 종료된 작기에는 자동 계획과 직접 작업을 새로 추가할 수 없지만 기존 일정과 이력은 계속 조회할 수 있습니다. 직접 등록 작업은 Crop Pack 처방이 아니며 sourceType `manual`, verificationStatus `draft`로 구분합니다. owner/admin은 같은 Farm 구성원에게 pending 또는 진행 중 FarmTask를 배정하거나 해제할 수 있습니다. 담당자 배정은 조율용 표시이며 다른 구성원의 작업 시작·완료를 제한하지 않습니다. owner/admin은 아직 시작하지 않은 예정 FarmTask를 취소할 수 있으며, 취소된 작업은 일정에 보존되고 Today에서는 제외됩니다. 생육 단계는 Crop Pack의 용어를 자유롭게 기록하는 현재 상태이며 변경해도 기존 FarmTask 일정은 자동으로 바뀌지 않습니다. 완료 기록은 ActionLog를 만들고 FarmTask를 완료 상태로 갱신합니다. 문제 기록은 관찰 사실을 ActionLog와 연결된 IssueRecord로 저장하며, 미해결 IssueRecord에서는 원본 문제를 참조하는 재확인 작업을 만들 수 있습니다. 사진은 결과 또는 문제 기록 뒤에 별도로 올리며, 비공개 Supabase Storage와 RLS로 보호됩니다. 사진 업로드에 실패해도 기존 결과·문제 기록은 유지됩니다. Fixture는 모두 `draft`이며 실제 농업 처방이나 확정 진단이 아닙니다. AI/Sensor/Market 기능은 이후 Slice에 포함합니다.
