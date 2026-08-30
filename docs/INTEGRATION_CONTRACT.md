# Integration Contract v0.2

**Status: PARTIALLY IMPLEMENTED — KMA Weather, nationwide Nongsaro Disease/Pest occurrence bulletin and Crop Pack-mapped Nongsaro crop references are live; KAMIS nationwide wholesale adapter/UI/cache are implemented pending deployment credentials; cultivar/growth-stage Disease/Pest remains a target contract**

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
| Weather | Farm forecast location | temperature, daily high/low, humidity, precipitation probability/amount, wind, update time; alert when regional mapping is available | 오늘 날씨 |
| Disease/Pest | CropCycle crop/cultivar/growth stage | name, crop relation, symptom, occurrence condition/period, inspection point, official reference | 현재 작기에서 확인할 병해충 정보 |
| Crop Information | CropCycle crop/cultivar/growth stage | current-stage reference, management point, task/reference link, official reference | 재배 참고정보 |
| Market | CropCycle crop and the Pilot’s whole-region wholesale default | item, market basis, price, unit, grade, base date, comparison when supplied | 시장 참고가격 |

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

Weather requires a reproducible forecast location. The implemented Pilot asks an owner/admin for a location label and only uses browser location after that person explicitly presses the confirmation button. It requests a fresh, high-accuracy device location for up to 30 seconds. If the browser cannot provide it, an owner/admin may one-time enter a map-derived latitude/longitude; the browser converts either source locally to the KMA 5km grid, clears the typed fallback values, and sends only the label and grid to the server. Neither original coordinate source nor a street address is stored, logged or sent to the API. FarmArea overrides and special-alert regional mapping are later work.

Crop context is the active CropCycle. Missing crop, cultivar or growth stage produces a clear prompt to complete the current-cultivation setup; it must not select a different crop’s information.

### Implemented first Disease/Pest slice

`GET /api/farms/{farmId}/information/disease-pest` currently uses Nongsaro `dbyhsCccrrncInfoList`. That provider endpoint publishes nationwide occurrence-bulletin metadata, not a reliable crop/cultivar/growth-stage result. The normalized response therefore contains only a title, published date and official attachment link, labels the card as nationwide reference material and never presents it as a Farm diagnosis, crop-specific alert or treatment guidance. The UI is shown beside the selected CropCycle only to retain Today context; it does not imply an API crop match.

### Implemented Crop Pack-mapped crop-reference slice

`GET /api/farms/{farmId}/information/crop?cropCycleId={uuid}` looks up the selected accessible CropCycle, then resolves its internal `cropCode` through a versioned Crop Pack profile. Only a profile explicitly registered with `verificationStatus: "evidence_checked"` can query Nongsaro `cropTechInfo`; an unregistered crop returns an honest unavailable state instead of using another crop's data. The adapter traverses the provider category tree and accepts only an exact official crop-name match before it reads its Disease/Pest technical-reference titles and original links. The result has no diagnosis, treatment, cultivar or growth-stage claim. It uses a 24-hour fresh TTL and can display a Farm-scoped normalized last-successful value as stale for 30 days.

### Implemented KAMIS nationwide wholesale-reference slice

`GET /api/farms/{farmId}/information/market?cropCycleId={uuid}` looks up the selected accessible CropCycle and resolves its internal `cropCode` through the same versioned Crop Pack profile. A profile must explicitly register the KAMIS item name, category and preferred grade; an unregistered crop returns an honest unavailable result and never substitutes another crop. The server-only adapter asks KAMIS `dailyPriceByCategoryList` for the `02` wholesale class without a region parameter, which is the KAMIS `전체지역` context. When KAMIS has no category rows for the requested day (for example a weekend or other non-market day), it checks the preceding calendar dates one at a time for up to seven days; it never invents a price and preserves the actual provider base date. Credential, provider-code, HTTP and network failures are not retried as a date fallback. It accepts an exact provider item-name match and prefers the registered grade, then normalizes only item, provider-supplied kind, grade, unit, base date, current price and preceding available price. The card calls this “전국 도매 참고가” for product language, but retains `전체지역` as the provider market basis. It is not a Farm sale price, a farmer receipt price or a revenue forecast. It uses a 6-hour fresh TTL and can display a Farm-scoped normalized last-successful value as stale for 48 hours.

## 6. Security and Operations

- Adapters run only in server Route Handlers or server modules.
- API keys are stored only in local and Vercel server environment variables.
- Provider timeout, HTTP status, provider error-code classification, request ID and cache update result may be logged without keys, provider response bodies, request URLs or raw Farm PII. The KAMIS market route records only a sanitized failure classification so Pilot operators can distinguish missing deployment credentials, provider rejection, network/timeout and malformed data while the user continues to see a Korean unavailable/stale state.
- Each cache/snapshot record is Farm-scoped where it contains Farm context and protected by existing membership RLS.
- An integration failure must return an `IntegrationResult`, not make the Today API fail.

## 7. Implementation Checklist

- [x] KMA account/key set in server-only Vercel environment variables
- [x] Nongsaro `dbyhsCccrrncInfoList` and Crop Pack-mapped `cropTechInfo` endpoint mapping set in server-only environment variables
- [x] KAMIS `dailyPriceByCategoryList` whole-region wholesale mapping, Crop Pack mapping and user-safe stale fallback implemented; deployment needs `KAMIS_CERT_KEY` and `KAMIS_CERT_ID`
- [x] KMA current-observation and short-forecast endpoint/field mapping documented in `PUBLIC_DATA_SOURCES.md`
- [x] Adapter unit tests for success, malformed response and stale fallback
- [x] Provenance/freshness contract and Korean UI messages tested
- [x] RLS, cache lifecycle and environment-key deployment reviewed
- [ ] Pilot user confirms wording is not read as diagnosis, advice or a sales-price prediction
