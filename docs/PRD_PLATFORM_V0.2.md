# Platform v0.2 PRD

**Status: CURRENT DEVELOPMENT BASELINE**

**Supersedes for new work:** `PRD_CORE_V0.1.md` is historical and remains the implemented Core baseline.

## 1. Goal

v0.2 makes the existing Farm Operations Core usable as a limited real-data Pilot. A farmer can register a real Farm and cultivation context, see Today first, check official reference information, and keep recording work and field observations without external-service failures breaking the operating flow.

## 2. Existing Capability Boundary

The following v0.1 flow is implemented and must remain working:

```text
Farm → CropCycle → TaskTemplate → FarmTask → Today
→ ActionLog → IssueRecord → Follow-up FarmTask → History
```

`TaskTemplate` fixture data is `draft`; it is not an agricultural prescription. v0.2 does not rewrite this model or create a separate FarmPlan entity.

## 3. Main User Journey

| Step | User language | System result |
|---:|---|---|
| 1 | 내 농장 등록 | Farm and weather-ready location context are stored |
| 2 | 재배 구역 등록 | Optional FarmArea is created |
| 3 | 재배 중인 작물 등록 | CropCycle records crop, cultivar, cultivation method, transplant/sowing date, growth stage and status |
| 4 | 오늘 보기 | Today tasks, issue attention and current cultivation context are first |
| 5 | 참고정보 보기 | Official Weather, Disease/Pest, Crop and Market cards show provenance and freshness |
| 6 | 작업 기록 | Existing ActionLog flow records start, completion, not checked or issue |
| 7 | 관찰 기록 | Observation or Measurement can be recorded without a FarmTask |
| 8 | 문제와 후속 확인 | Existing IssueRecord and Follow-up FarmTask preserve the relationship |
| 9 | 이력 보기 | Work, observation, issue and follow-up context can be inspected |

## 4. Functional Requirements

| ID | Requirement | Delivery status |
|---|---|---|
| FR-01 | Preserve the v0.1 Farm, CropCycle, FarmTask, ActionLog, IssueRecord, Attachment and membership work cycle. | implemented |
| FR-02 | A Farm has zero or more named FarmAreas without GIS complexity. | planned |
| FR-03 | CropCycle and FarmTask can optionally identify their FarmArea. | planned |
| FR-04 | A user can add an Observation as an observed fact without a FarmTask. | planned |
| FR-05 | A user can add a numeric Measurement with metric, value, unit and observed time without a FarmTask. | planned |
| FR-06 | IssueRecord remains a non-diagnostic “확인이 필요한 문제” and can originate from an Observation. | planned |
| FR-07 | Today is the default action-first screen: tasks → issues → weather → current crop → market. | planned |
| FR-08 | Weather shows actual official data: current temperature, high/low, humidity, precipitation probability/amount, wind, alert when available, and update time. | planned; provider key required |
| FR-09 | Disease/Pest and Crop Information show official crop-context reference information, never a diagnosis. | planned; provider key and content review required |
| FR-10 | Market shows actual reference price with item, market, price, unit, grade, base date, source and recent comparison when supplied. | planned; provider key required |
| FR-11 | External data is server-only, normalized, cacheable and provenance-aware. | planned |
| FR-12 | An external provider failure cannot block Farm, Today, Task, Observation, Issue or History actions. | planned |

## 5. UX Requirements

| ID | Requirement |
|---|---|
| UX-01 | After sign-in, users can find today’s work in 30 seconds without training. |
| UX-02 | A key task can be completed in at most two or three purposeful selections. |
| UX-03 | User-facing UI uses 농장, 재배 구역, 현재 작기, 생육 단계, 오늘 할 일, 관찰 기록 and 확인이 필요한 문제; it does not lead with internal terms such as Farm or CropCycle. |
| UX-04 | Critical status is conveyed with text and icon/shape as well as color. |
| UX-05 | Primary touch targets are large and text-labeled; icon-only critical actions are not used. |
| UX-06 | The main mobile screen favors cards/lists and progressive disclosure over dense tables and calendars. |
| UX-07 | Every public-data card makes source and base/update time available. |
| UX-08 | Provider failure has a human Korean message and a retry/last-normal-data state, never a raw technical error. |
| UX-09 | Diagnosis, advice, observation and official reference information are explicitly distinguished. |
| UX-10 | A senior-user Pilot can complete the core Today and record flow without a facilitator explaining the screen. |

## 6. Safety and Data Rules

- No default mock values in production UI. Development and test fixtures are separately marked `draft`.
- A Disease/Pest card says “현재 작기에서 확인할 병해충 정보”; it never says a disease occurred in the Farm.
- A Market card says “시장 참고가격” and identifies the actual market, grade, unit and base date; it never predicts a user’s sale price.
- Weather and reference information do not automatically create FarmTasks, diagnose crops or control facilities.
- Raw provider responses, keys and provider-specific fields are not exposed to client components.

## 7. Minimum Data Provenance

Every external information result has the following normalized metadata.

```text
provider, sourceName, sourceReference,
publishedAt or observedAt, retrievedAt,
verificationStatus, freshness
```

`freshness` is `fresh`, `stale` or `unavailable`. A stale result clearly shows the latest successful update time. Cache and failure behaviour are defined in [INTEGRATION_CONTRACT.md](INTEGRATION_CONTRACT.md).

## 8. Non-goals

- Sensor connection, AI diagnosis, LLM agent, automation, prescription or recommendation
- Farm sales-price prediction, yield prediction, accounting, inventory, sales order or ERP
- Microservice, Kafka, event bus, data warehouse, complex repository pattern or complex GIS
- Crop-specific Core service branches such as `strawberryTaskService`

## 9. Pilot Acceptance Criteria

| ID | Criterion |
|---|---|
| AC-01 | An owner can create a real Farm, add a simple location context and an optional FarmArea. |
| AC-02 | A user can find today’s tasks, active issues and current crop context from the first screen. |
| AC-03 | Weather, Disease/Pest, Crop Information and Market each display official data with provenance, or an honest unavailable/stale state. |
| AC-04 | A user can record a task result, Observation, Measurement and Issue without losing existing v0.1 data. |
| AC-05 | A provider outage affects only its card; Today and recording continue normally. |
| AC-06 | Farm membership RLS still prevents cross-Farm reads and writes for all new records and cached external data. |
| AC-07 | A second test crop can use the same Core logic with no crop-code branch. |
| AC-08 | Pilot participants can complete the tasks in [PILOT_VALIDATION_GUIDE.md](PILOT_VALIDATION_GUIDE.md). |

## 10. Delivery Order

1. Documentation and source review
2. Frontend type/feature extraction and Today-first UX foundation
3. FarmArea
4. Observation and Measurement
5. Provenance and integration cache contract
6. Weather
7. Disease/Pest and Crop Information
8. Market
9. Pilot validation and hardening

Each is an independent Issue, Branch and PR with migration, contract, RLS and test changes when data shape changes.
