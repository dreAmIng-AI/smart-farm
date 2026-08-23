# Public Data Sources for v0.2 Pilot

**Status: SOURCE REGISTER — candidates are not yet connected to the product**

This register records the official candidates selected for the Pilot. Before implementation, the owner must obtain the relevant key, verify the current usage terms and record the exact endpoint/field mapping. A source is not production-ready merely because it has a public web page.

## 1. Candidate Register

| Module | Candidate | Official provider | Access status | Pilot use |
|---|---|---|---|---|
| Weather | [기상청 단기예보 조회서비스](https://www.data.go.kr/data/15084084/openapi.do) | 기상청 / 공공데이터포털 | ServiceKey required; exact endpoint and publication schedule to be confirmed at registration | Current conditions and short forecast by approved forecast grid |
| Weather location metadata | [기상청 예보구역정보 조회서비스](https://www.data.go.kr/data/15057111/openapi.do) | 기상청 / 공공데이터포털 | ServiceKey required; documentation shows JSON/XML and automatic approval information | Forecast-area and warning-context validation |
| Disease/Pest | [농사로 OpenAPI](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191) and [병해충 발생정보](https://api.nongsaro.go.kr/sample/rest/dbyhsCccrrncInfo/dbyhsCccrrncInfo.jsp) | 농촌진흥청 / 농사로 | Identity verification, application and issued key required | Crop-context reference and occurrence bulletin; never Farm diagnosis |
| Crop Information | [농사로 공공 데이터](https://www.data.go.kr/data/15087193/openapi.do) | 농촌진흥청 / 농사로 | Key and exact content API selection required | Crop/growth-stage reference link and official guidance summary |
| Market | [KAMIS Open API](https://www.kamis.or.kr/customer/reference/openapi_list.do) | 한국농수산식품유통공사(aT) | KAMIS key / requester ID or public-data portal key required | Daily wholesale or retail reference price with market, grade and unit |

## 2. Confirmed Characteristics from Official Documentation

- KAMIS documents daily item/category price APIs and recent price-trend APIs. Its request parameters identify the retail/wholesale class, location, date and unit conversion, so the product must label the returned market and price meaning rather than calling it a farm sale forecast. [KAMIS Open API 안내](https://www.kamis.or.kr/customer/reference/openapi_list.do?action=detail&boardno=1)
- 농사로 describes OpenAPI registration as phone identity verification, application approval, then issued key. Its data catalogue and endpoint-level crop filtering must be validated before selecting the exact Disease/Pest and Crop Information adapters. [농사로 OpenAPI 안내](https://www.nongsaro.go.kr/portal/ps/psz/psza/contentMain.ps?menuId=PS00191)
- The public-data portal’s weather material documents forecast-region metadata, JSON/XML responses and a ServiceKey. KMA short forecasts are grid-based, so a Pilot Farm needs a user-confirmed mapping rather than an implicit browser location. [기상청 예보구역정보](https://www.data.go.kr/data/15057111/openapi.do)

## 3. Required Before Any Production Call

| Item | Weather | Disease/Crop | Market |
|---|---|---|---|
| Account/key | Public Data Portal ServiceKey | Nongsaro identity verification and issued key | KAMIS key/requester ID or Public Data Portal key |
| Exact endpoint | Current/short forecast and warnings | Crop-specific reference and pest/bulletin endpoint | Initial wholesale or retail endpoint and item/grade codes |
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

- [ ] Exact KMA short-forecast endpoint, categories and issue-time schedule
- [ ] Pilot Farm administrative-area-to-grid mapping and privacy wording
- [ ] Nongsaro Disease/Pest endpoint that reliably supports the first reference crop
- [ ] Nongsaro Crop Information endpoint and permitted summary/link usage
- [ ] KAMIS strawberry item/kind/grade/market code mapping and choice of wholesale vs retail first
- [ ] Each provider’s current traffic, attribution and commercial-use terms at key issuance time
