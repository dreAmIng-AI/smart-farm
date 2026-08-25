# Public Data Sources for v0.2 Pilot

**Status: SOURCE REGISTER — KMA Weather is connected; remaining sources are candidates**

This register records the official candidates selected for the Pilot. Before implementation, the owner must obtain the relevant key, verify the current usage terms and record the exact endpoint/field mapping. A source is not production-ready merely because it has a public web page.

## 1. Candidate Register

| Module | Candidate | Official provider | Access status | Pilot use |
|---|---|---|---|---|
| Weather | [기상청 API Hub 동네예보 격자자료](https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286) | 기상청 API Hub | KMA server-only `authKey` registered | `getUltraSrtNcst` current observations and `getVilageFcst` short forecast by Farm grid |
| Weather alert | [기상청 API Hub 특보현황](https://apihub.kma.go.kr/apiList.do?apiMov=%ED%8A%B9.%EC%A0%95%EB%B3%B4+%EC%9E%90%EB%A3%8C+%EC%A1%B0%ED%9A%8C&seqApi=10&seqApiSub=288) | 기상청 API Hub | `wrn_now_data_new.php` access issued; regional mapping remains pending | Later Farm-grid to warning-area mapping |
| Disease/Pest | [농사로 OpenAPI](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191) and [병해충 발생정보](https://api.nongsaro.go.kr/sample/rest/dbyhsCccrrncInfo/dbyhsCccrrncInfo.jsp) | 농촌진흥청 / 농사로 | Identity verification, application and issued key required | Crop-context reference and occurrence bulletin; never Farm diagnosis |
| Crop Information | [농사로 공공 데이터](https://www.data.go.kr/data/15087193/openapi.do) | 농촌진흥청 / 농사로 | Key and exact content API selection required | Crop/growth-stage reference link and official guidance summary |
| Market | [KAMIS Open API](https://www.kamis.or.kr/customer/reference/openapi_list.do) | 한국농수산식품유통공사(aT) | KAMIS key / requester ID or public-data portal key required | Daily wholesale or retail reference price with market, grade and unit |

## 2. Confirmed Characteristics from Official Documentation

- KAMIS documents daily item/category price APIs and recent price-trend APIs. Its request parameters identify the retail/wholesale class, location, date and unit conversion, so the product must label the returned market and price meaning rather than calling it a farm sale forecast. [KAMIS Open API 안내](https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=1)
- 농사로 describes OpenAPI registration as phone identity verification, application approval, then issued key. Its data catalogue and endpoint-level crop filtering must be validated before selecting the exact Disease/Pest and Crop Information adapters. [농사로 OpenAPI 안내](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191)
- KMA API Hub publishes the current-observation and short-forecast grid endpoints used by the Weather adapter. The short forecast is produced at 02, 05, 08, 11, 14, 17, 20 and 23 KST; current observations are updated more frequently. The adapter records the KMA-provided base/publication time and keeps a bounded fallback. [기상청 동네예보 격자자료](https://apihub.kma.go.kr/apiList.do?seqApi=10&seqApiSub=286)

## 3. Required Before Any Production Call

| Item | Weather | Disease/Crop | Market |
|---|---|---|---|
| Account/key | KMA API Hub `authKey` | Nongsaro identity verification and issued key | KAMIS key/requester ID or Public Data Portal key |
| Exact endpoint | Implemented current/short forecast; warning regional mapping pending | Crop-specific reference and pest/bulletin endpoint | Initial wholesale or retail endpoint and item/grade codes |
| Mapping | Farm area → KMA grid / forecast point | `crop_code`, cultivar, growth stage → official query | `crop_code` → KAMIS item/kind/market/grade code |
| Legal/operational review | attribution, rate limit, update schedule | attribution, reuse conditions, update schedule | attribution, rate limit, price meaning and update schedule |
| Environment | server-only key | server-only key | server-only key |

## 4. Data Presentation Rules

- If no result exists, show “현재 확인 가능한 데이터가 없습니다.” No mock number or placeholder diagnosis is allowed.
- If a cached result is old, show the source and last successful update time.
- Weather is reference context, not an automatic agricultural recommendation.
- Disease/Pest is official information relevant to the selected crop, not a statement that a condition was found.
- Market is “시장 참고가격” with market, grade, unit and base date, not predicted revenue.

## 5. Open Verification Items

- [x] KMA current/short forecast endpoint, categories and issue-time schedule
- [x] Pilot Farm label-to-grid mapping and privacy wording
- [ ] KMA special-alert area-to-Farm grid mapping
- [ ] Nongsaro Disease/Pest endpoint that reliably supports the first reference crop
- [ ] Nongsaro Crop Information endpoint and permitted summary/link usage
- [ ] KAMIS strawberry item/kind/grade/market code mapping and choice of wholesale vs retail first
- [ ] Each provider’s current traffic, attribution and commercial-use terms at key issuance time
