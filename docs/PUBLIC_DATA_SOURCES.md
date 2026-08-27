# Public Data Sources for v0.2 Pilot

**Status: SOURCE REGISTER — KMA Weather, nationwide Nongsaro occurrence bulletin and Crop Pack-mapped Nongsaro crop references are connected; cultivar/growth-stage Disease/Pest and Market remain candidates**

This register records the official candidates selected for the Pilot. Before implementation, the owner must obtain the relevant key, verify the current usage terms and record the exact endpoint/field mapping. A source is not production-ready merely because it has a public web page.

## 1. Candidate Register

| Module | Candidate | Official provider | Access status | Pilot use |
|---|---|---|---|---|
| Weather | [기상청 API Hub 동네예보 격자자료](https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286) | 기상청 API Hub | KMA server-only `authKey` registered | `getUltraSrtNcst` current observations and `getVilageFcst` short forecast by Farm grid |
| Weather alert | [기상청 API Hub 특보현황](https://apihub.kma.go.kr/apiList.do?apiMov=%ED%8A%B9.%EC%A0%95%EB%B3%B4+%EC%9E%90%EB%A3%8C+%EC%A1%B0%ED%9A%8C&seqApi=10&seqApiSub=288) | 기상청 API Hub | `wrn_now_data_new.php` access issued; regional mapping remains pending | Later Farm-grid to warning-area mapping |
| Disease/Pest | [농사로 OpenAPI](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191) and [병해충 발생정보](https://api.nongsaro.go.kr/sample/rest/dbyhsCccrrncInfo/dbyhsCccrrncInfo.jsp) | 농촌진흥청 / 농사로 | server-only key configured for `dbyhsCccrrncInfoList` | nationwide occurrence bulletin metadata with official attachment; never Farm diagnosis |
| Crop Information | [농사로 작목기술 서비스](https://api.nongsaro.go.kr/sample/rest/cropTechInfo/cropTechInfo.jsp) | 농촌진흥청 / 농사로 | server-only `cropTechInfo` use with Crop Pack profile mapping | exact-crop technical Disease/Pest title and official original link; no diagnosis or advice |
| Market | [KAMIS Open API](https://www.kamis.or.kr/customer/reference/openapi_list.do) | 한국농수산식품유통공사(aT) | KAMIS key / requester ID or public-data portal key required | Daily wholesale or retail reference price with market, grade and unit |

## 2. Confirmed Characteristics from Official Documentation

- KAMIS documents daily item/category price APIs and recent price-trend APIs. Its request parameters identify the retail/wholesale class, location, date and unit conversion, so the product must label the returned market and price meaning rather than calling it a farm sale forecast. [KAMIS Open API 안내](https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=1)
- 농사로 describes OpenAPI registration as phone identity verification, application approval, then issued key. The implemented `dbyhsCccrrncInfoList` endpoint returns title, author, registration date, view count and attachment metadata for nationwide occurrence bulletins. The implemented `cropTechInfo` adapter resolves an internal Crop Pack `cropCode` to an explicitly registered Korean provider name and accepts only an exact Nongsaro category match before it returns technical-reference title/link metadata. It does not establish a cultivar or growth-stage match. [농사로 OpenAPI 안내](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191)
- KMA API Hub publishes the current-observation and short-forecast grid endpoints used by the Weather adapter. The short forecast is produced at 02, 05, 08, 11, 14, 17, 20 and 23 KST; current observations are updated more frequently. The adapter records the KMA-provided base/publication time and keeps a bounded fallback. [기상청 동네예보 격자자료](https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286)

## 3. Required Before Any Production Call

| Item | Weather | Disease/Crop | Market |
|---|---|---|---|
| Account/key | KMA API Hub `authKey` | `dbyhsCccrrncInfoList` and `cropTechInfo` use the server-only Nongsaro key; provider access is isolated by unavailable state | KAMIS key/requester ID or Public Data Portal key |
| Exact endpoint | Implemented current/short forecast; warning regional mapping pending | `dbyhsCccrrncInfoList` nationwide bulletin and `cropTechInfo` exact-crop title/link reference implemented | Initial wholesale or retail endpoint and item/grade codes |
| Mapping | Farm area → KMA grid / forecast point | nationwide bulletin has no crop mapping; Crop Pack `crop_code` → registered Korean crop name → exact provider category implemented; cultivar/growth stage remains pending | `crop_code` → KAMIS item/kind/market/grade code |
| Legal/operational review | attribution, rate limit, update schedule | attribution, reuse conditions, update schedule | attribution, rate limit, price meaning and update schedule |
| Environment | server-only key | server-only key | server-only key |

## 4. Data Presentation Rules

- If no result exists, show “현재 확인 가능한 데이터가 없습니다.” No mock number or placeholder diagnosis is allowed.
- If a cached result is old, show the source and last successful update time.
- Weather is reference context, not an automatic agricultural recommendation.
- Crop-context Disease/Pest is official information relevant to the selected crop, not a statement that a condition was found. The implemented nationwide occurrence bulletin is explicitly labelled as non-crop-specific reference material. The Crop Pack-mapped reference card shows only exact-crop official links and remains non-diagnostic.
- Market is “시장 참고가격” with market, grade, unit and base date, not predicted revenue.

## 5. Open Verification Items

- [x] KMA current/short forecast endpoint, categories and issue-time schedule
- [x] Pilot Farm label-to-grid mapping and privacy wording
- [ ] KMA special-alert area-to-Farm grid mapping
- [x] Nongsaro Crop Pack-mapped exact-crop title/link reference endpoint (`cropTechInfo`); cultivar/growth-stage mapping remains open
- [ ] KAMIS strawberry item/kind/grade/market code mapping and choice of wholesale vs retail first
- [ ] Each provider’s current traffic, attribution and commercial-use terms at key issuance time
