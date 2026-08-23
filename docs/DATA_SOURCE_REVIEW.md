# DATA_SOURCE_REVIEW.md

> **Status: REFERENCE**
>
> 이 문서는 v0.2 Baseline Module 또는 Lab의 외부 데이터원 검토 템플릿입니다. 이 문서만으로 API 구현·Secret 등록·production 도입이 승인되지는 않습니다. Pilot 후보의 현재 상태는 `PUBLIC_DATA_SOURCES.md`를 우선 확인합니다.

외부 API 또는 공식정보를 도입하기 전에 작성하는 검토 템플릿입니다.

## 기본정보

- Source ID:
- Source Name:
- Official URL:
- 담당 검토자:
- 검토일:
- 상태: `unverified | usable | restricted | rejected`

## 접근

- API 제공 여부:
- 인증 방식:
- 키 발급 절차:
- 요청 파라미터:
- 응답 형식:
- 호출 제한:
- 갱신 주기:
- 빈 데이터 조건:
- 장애 시 동작:

## 서비스 적합성

- 딸기 검색 가능:
- 설향 품종 구분:
- 생육단계 연결 가능:
- 지역 연결 가능:
- FarmTask 근거로 사용 가능:
- 사용자에게 표시할 핵심 필드:

## 이용조건

- licenseType:
- attributionRequired:
- commercialUseAllowed:
- modificationAllowed:
- redistributionAllowed:
- thirdPartyRights:
- originalSourceUrlRequired:
- 법적 추가 확인 필요:

API가 존재한다는 이유만으로 상업적 이용과 가공이 가능하다고 판단하지 않습니다.

## Normalization

- 원본 식별자:
- 표준 category:
- cropCode 매핑:
- cultivar 매핑:
- growthStage 매핑:
- regionCode 매핑:
- sourceUpdatedAt:
- retrievedAt:

## 캐시와 Fallback

- 권장 캐시 시간:
- 마지막 성공 데이터 사용 가능 기간:
- 장애 메시지:
- 핵심 기능 영향:

## 최종 판단

- [ ] 도입
- [ ] 제한적 도입
- [ ] 추가 검토
- [ ] 제외

근거:
