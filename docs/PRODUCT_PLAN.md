# Product Plan: dreAmIng Smart Farm Platform v0.2

**Status: CURRENT PRODUCT DIRECTION**

**Scope: Real Data Pilot + Senior-Friendly UX Upgrade**

## 1. Product Direction

v0.2는 Core Platform v0.1을 버리거나 Prototype을 새로 만드는 작업이 아니다. 이미 구현된 Farm → CropCycle → 계획 → Today → 실행·기록 → Issue → Follow-up → History의 실제 운영 흐름을 보존한다.

제품은 다음 순서로 전환한다.

```text
실제 농장 정보 + 실제 공공 참고정보 + 실제 작업 기록
→ 제한된 Pilot 사용 → 현장 관찰 → 개선
```

가상의 날씨·병해충·가격을 기본값으로 표시하지 않는다. 공식 데이터가 없거나 갱신에 실패하면 해당 카드에 데이터 없음 또는 마지막 정상 데이터의 기준시점을 표시한다. FarmTask, 기록, 이력은 외부 데이터 상태와 무관하게 계속 동작해야 한다.

## 2. Vision

> 농장의 작기와 작업을 중심으로 날씨, 병해충, 재배정보, 시장정보와 현장 기록을 연결하여 농업인이 오늘 무엇을 확인하고 무엇을 해야 하는지 쉽게 알 수 있게 한다.

정보를 많이 모은 농업 포털이나 판매 ERP를 만들지 않는다. 첫 화면은 사용자의 판단 시간을 줄이는 Today 화면이다.

## 3. Target User and UX Promise

- Primary: 실제 농장을 운영하며 바쁜 현장에서 휴대전화로 오늘의 일을 확인·기록하는 농업인
- Additional consideration: 디지털 서비스에 익숙하지 않은 고령 사용자
- Secondary: 같은 Farm에서 일정과 기록을 함께 보는 관리자·작업자

사용자는 로그인 뒤 30초 안에 다음을 파악할 수 있어야 한다.

1. 오늘 해야 할 일
2. 확인이 필요한 문제
3. 현재 재배 중인 작물과 생육 단계
4. 오늘 날씨
5. 시장 참고정보

자세한 근거, 과거 이력, 원시 관측값은 두 번째 화면으로 미룬다.

## 4. v0.2 Product Structure

```text
dreAmIng Smart Farm Platform
├── Operations Core
│   ├── Farm → FarmArea → CropCycle → GrowthStage
│   ├── FarmTask → ActionLog → IssueRecord → Follow-up → History
│   └── Observation / Measurement
├── Baseline Modules
│   ├── Weather
│   ├── Disease / Pest
│   ├── Crop Information
│   └── Market Information
├── Crop Packs
│   └── Strawberry / Seolhyang first; data, not Core branching
└── Labs
    ├── Sensor, AI, Analytics, Automation
    └── Prediction and advanced market intelligence
```

Weather, Disease/Pest, Crop Information, Market Information은 최소 실사용 범위에서 Baseline Module로 승격한다. AI 진단·자동 제어·예측 등 고도화 기능은 Lab에 남긴다.

## 5. Existing Core to Preserve

다음 도메인과 보안 경계는 우선 재사용한다.

- Farm, CropCycle, TaskTemplate, FarmTask
- ActionLog, IssueRecord, Attachment
- FarmMembership, owner/admin/farmer 권한과 Supabase RLS
- CropCycle + TaskTemplate → Scheduled FarmTask[] 계획 구조

`ActionLog` 또는 `IssueRecord` 이름을 바꾸지 않는다. 새 `farm_plans` 테이블, 작물별 Core 분기, Microservice, Queue, Event Bus, Data Warehouse를 만들지 않는다.

## 6. Baseline Data Principles

1. 공식 Public API 또는 공공기관 데이터만 우선 사용한다.
2. Provider JSON은 서버의 Adapter와 Normalizer 밖으로 노출하지 않는다.
3. 모든 외부 데이터에는 provider, sourceName, sourceReference, publishedAt/observedAt, retrievedAt, verificationStatus, freshness를 보관한다.
4. Cache된 마지막 정상 값은 명확히 오래된 데이터로 표시한다.
5. 병해충·재배정보는 참고 정보이며, 농장에 병이 발생했다는 진단이나 처방으로 표현하지 않는다.
6. 시장정보는 시장·등급·단위·기준일을 포함한 참고가격이며, 사용자 농장의 예상 판매가격으로 표현하지 않는다.

공식 Source 후보와 인증·이용조건 상태는 [PUBLIC_DATA_SOURCES.md](PUBLIC_DATA_SOURCES.md)에서 관리한다.

## 7. v0.2 Pilot Scope

### Operations Core extension

- Farm 아래의 실제 관리 공간인 FarmArea
- FarmArea와 선택적으로 연결되는 CropCycle·FarmTask
- FarmTask 없이 남길 수 있는 Observation과 수치 Measurement
- Observation에서 확인이 필요한 IssueRecord로 연결하는 최소 흐름

### Action-first Today

- 농장명, 현재 작기(작물·품종·생육 단계)
- 오늘 할 일과 지연 작업
- 확인이 필요한 문제
- 실제 날씨 요약
- 현재 작기 관련 병해충·재배정보 요약
- 시장 참고가격 요약

### Real data pilot

- Weather: 기상청 공식 예보
- Disease/Pest and Crop Information: 농촌진흥청·농사로 공식 정보
- Market: KAMIS 등 공식 시장 가격정보

각 module은 독립적으로 실패하고, Core 기록 기능을 차단하지 않는다.

## 8. Out of Scope

- Sensor 실시간 연동, AI diagnosis, LLM agent
- 자동 관수·환기·양액, 농약·비료 추천
- 가격·수확량 예측, 회계·재고·주문 ERP
- 복잡한 GIS, Digital Twin, Microservice 및 Event Bus 인프라
- 여러 작물의 대규모 상용 Crop Pack 운영

## 9. Pilot Success Criteria

실제 농장 하나에서 Mock 없이 다음 흐름을 수행할 수 있어야 한다.

```text
농장 등록 → 재배 구역 등록 → 현재 작기 등록 → 오늘 할 일 확인
→ 실제 날씨·공식 참고정보 확인 → 작업 결과 기록
→ Observation / Issue 기록 → Follow-up → History → 시장 참고가격 확인
```

현재 Operations Core는 작업·기록 흐름, Today-first UX, FarmArea와 선택적으로 연결되는 CropCycle·FarmTask, 독립 Observation·수동 Measurement, Observation-origin IssueRecord, KMA 실제 Weather, 전국 단위 Nongsaro 병해충 발생정보와 Crop Pack으로 연결한 Nongsaro 작물별 참고자료까지 운영 중이다. KAMIS 전체지역 도매 참고가격의 adapter·Today UI·cache는 구현되어 있으며 배포용 자격증명 등록 뒤 실제 데이터를 확인한다. 품종·생육 단계까지 직접 맞춘 Disease/Pest와 Pilot 데이터 검증은 별도 작은 PR로 추가한다. 따라서 v0.2 Pilot 준비 상태는 지금 `PARTIAL`이다.

## 10. Delivery Sequence

1. v0.2 product, UX, data, integration, Pilot 계약 문서
2. 공통 Domain Type과 feature 단위 Frontend 정리
3. Today-first navigation과 시니어 친화 화면
4. FarmArea
5. Observation / Measurement 및 standalone Issue 흐름
6. Integration Contract와 provenance/cache
7. KMA Weather → Nongsaro 전국 발생정보 → Crop Pack-mapped crop reference → KAMIS 전체지역 도매 참고가격 → cultivar/growth-stage context와 지역 출하시장 비교
8. Pilot validation, RLS·regression·문서 동기화

각 단계는 독립 Issue·Branch·PR로 병합한다. 실제 API 키 또는 위치 입력 방식처럼 외부 권한이 필요한 지점은 구현 전에 결정한다.
