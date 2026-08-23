# Integration Contract v0.2

**Status: TARGET CONTRACT — no external provider is implemented by this document**

## 1. Purpose

Weather, Disease/Pest, Crop Information and Market providers enrich the Farm context. They are not part of the transaction path for Farm, CropCycle, FarmTask, ActionLog, Observation, IssueRecord or History.

```text
Official Public API
→ server-only Provider Adapter
→ Normalizer
→ cache / last successful snapshot
→ Integration Contract
→ Today and detail UI
```

Provider-specific JSON must not reach React components or the Operations Core domain.

## 2. Normalized Result Envelope

All baseline module adapters return the same outer shape.

```ts
type Freshness = "fresh" | "stale" | "unavailable";

type Provenance = {
  provider: string;
  sourceName: string;
  sourceReference: string;
  observedAt?: string;
  publishedAt?: string;
  retrievedAt: string;
  verificationStatus: "official_source" | "cached_official_source";
  freshness: Freshness;
};

type IntegrationResult<T> =
  | { status: "available"; data: T; provenance: Provenance }
  | { status: "stale"; data: T; provenance: Provenance; message: string }
  | { status: "unavailable"; data: null; provenance?: Provenance; message: string };
```

The UI consumes this result, never HTTP/provider error strings. Credentials are server environment variables and are never placed in `NEXT_PUBLIC_*` keys.

## 3. Module Contracts

| Module | Core context | Minimum normalized data | User wording |
|---|---|---|---|
| Weather | Farm location + active CropCycle | temperature, daily high/low, humidity, precipitation probability/amount, wind, alert, update time | 오늘 날씨 |
| Disease/Pest | CropCycle crop/cultivar/growth stage | name, crop relation, symptom, occurrence condition/period, inspection point, official reference | 현재 작기에서 확인할 병해충 정보 |
| Crop Information | CropCycle crop/cultivar/growth stage | current-stage reference, management point, task/reference link, official reference | 재배 참고정보 |
| Market | CropCycle crop and configured market context | item, market, price, unit, grade, base date, comparison when supplied | 시장 참고가격 |

No module may infer diagnosis, prescription, predicted sale price or an automatic task.

## 4. Cache and Failure Policy

| Module | Initial fresh TTL | Maximum stale display | Failure behaviour |
|---|---:|---:|---|
| Weather | 30 minutes | 6 hours | Show “최신 날씨 정보를 불러오지 못했습니다.” and last successful time if available. |
| Disease/Pest | 24 hours | 7 days | Show a dated official reference or unavailable state. |
| Crop Information | 24 hours | 30 days | Show a dated official reference or unavailable state. |
| Market | 6 hours | 48 hours | Show “시장정보를 불러오지 못했습니다.” and the last base date if available. |

TTL values are initial Pilot defaults and must be reviewed against each provider’s real publication cycle before enabling production calls. The first durable-cache migration should add only a focused, Farm-context cache/snapshot store; Redis is not a prerequisite.

## 5. Location and Context

Weather requires a reproducible forecast location. The Pilot shall ask for a user-confirmed administrative area / forecast point during Farm setup and must not silently use browser GPS or retain a street address by default. The exact KMA grid mapping and data fields are a prerequisite for the Weather implementation Issue.

Crop context is the active CropCycle. Missing crop, cultivar or growth stage produces a clear prompt to complete the current-cultivation setup; it must not select a different crop’s information.

## 6. Security and Operations

- Adapters run only in server Route Handlers or server modules.
- API keys are stored only in local and Vercel server environment variables.
- Provider timeout, status code, request ID and cache update result are logged without keys or raw Farm PII.
- Each cache/snapshot record is Farm-scoped where it contains Farm context and protected by existing membership RLS.
- An integration failure must return an `IntegrationResult`, not make the Today API fail.

## 7. Implementation Checklist

- [ ] Provider account, key, request limit and licensing verified
- [ ] Exact endpoint and field mapping documented in `PUBLIC_DATA_SOURCES.md`
- [ ] Adapter unit tests for success, no data, malformed response, timeout and stale fallback
- [ ] Provenance/freshness contract and Korean UI messages tested
- [ ] RLS, cache lifecycle and environment-key deployment reviewed
- [ ] Pilot user confirms wording is not read as diagnosis, advice or a sales-price prediction
