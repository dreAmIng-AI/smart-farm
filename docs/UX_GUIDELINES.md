# v0.2 UX Guidelines

**Status: CURRENT UX REQUIREMENTS FOR NEW OR CHANGED SCREENS**

## 1. Design Principle

The first screen is an action aid, not an operations dashboard. A busy farmer must understand the most important next action without studying the product structure.

```text
오늘 할 일 → 확인할 문제 → 오늘 날씨 → 현재 작기 → 시장 참고가격
```

Internal names remain valid in code and contracts but are not the primary user language.

| Internal | User-facing Korean |
|---|---|
| Farm | 농장 |
| FarmArea | 재배 구역 |
| CropCycle | 현재 작기 / 재배 중인 작물 |
| GrowthStage | 생육 단계 |
| FarmTask | 오늘 할 일 / 농작업 |
| IssueRecord | 확인이 필요한 문제 |
| Observation | 관찰 기록 |
| Measurement | 측정 기록 |
| Verification Status | 정보 출처 / 검증정보 |

## 2. Today First Screen

The signed-in default view should be structured as follows. Detail pages hold calendar, raw history, provider fields and settings.

```text
안녕하세요
A농장 · 딸기 설향
현재 개화기

오늘 할 일 3개
□ 1동 환기 확인
□ 꽃 상태 확인
□ 관수 상태 확인
[오늘 작업 보기]

확인해 보세요
⚠ 확인이 필요한 문제 2건
[확인하기]

오늘 날씨
28℃ · 오후 비 가능성 높음
출처: 기상청 · 08:00 업데이트
[자세히 보기]

시장 참고가격
딸기 · 전주 대비 +5%
출처: KAMIS · 기준일 8월 22일
[시장정보 보기]
```

This is a layout and wording example, not permission to fabricate weather, issue or market values.

## 3. Senior-Friendly Requirements

- Use a readable mobile body size and larger size for task count, task title and important warnings.
- Every primary action uses a text label and a sufficiently large touch area. Avoid icon-only actions for starting, completing, recording or saving.
- Limit the primary action on one view. Use progressive disclosure for evidence, source metadata and history.
- Prefer cards and lists to dense tables. Monthly/weekly schedules are secondary views, not the first mobile experience.
- Never depend on color alone. Include a status word such as `⚠ 확인 필요`, `오늘`, `지연`, `완료`.
- Write user-facing Korean. Translate technical errors to a clear recovery message.
- Preserve keyboard focus, accessible labels, visible focus state and semantic buttons/links.

## 4. Mobile Navigation

The target bottom navigation has at most five destinations:

| Destination | Purpose |
|---|---|
| 오늘 | Today tasks, urgent issues and reference-card summaries |
| 작기 | Current cultivation, plan and schedule |
| 기록 | Task result, observation, measurement and issue entry |
| 정보 | Weather, Disease/Pest, Crop Information and Market details |
| 농장 | Farm, FarmArea, members and settings |

Navigation is introduced only when its route/state architecture is ready; it must not duplicate the same mutations across separate screens.

## 5. Onboarding

Do not start a new user with a large configuration dashboard. Ask only the context required for the first Today screen.

1. 농장 이름과 확인할 지역
2. 재배 중인 작물과 품종
3. 정식일 또는 파종일
4. 재배 구역 (optional)

After completion, take the user to Today. The exact Farm location field must protect privacy and be sufficient for the chosen official forecast provider.

## 6. External Data States

| State | Required user message |
|---|---|
| Fresh | `출처: 기상청 · 08:00 업데이트` |
| Stale | `최신 날씨 정보를 확인하지 못해 이전 정보입니다. 마지막 업데이트: 어제 17:00` |
| Unavailable | `현재 확인 가능한 날씨 정보가 없습니다. 잠시 후 다시 확인해 주세요.` |
| Missing context | `날씨를 보려면 농장 지역을 먼저 확인해 주세요.` |

Never show `500 Internal Server Error`, `Fetch failed`, `Provider unavailable`, raw API codes or keys in the UI.

## 7. Acceptance Checklist

- [ ] A participant finds Today tasks without being told where to look.
- [ ] A participant can complete the main task result path in no more than 2–3 meaningful selections from Today.
- [ ] The first screen never leads with “Farm”, “CropCycle”, “FarmTask” or “verificationStatus”.
- [ ] An urgent condition is readable without color perception.
- [ ] A data source and base/update time is available for every external-data card.
- [ ] A provider outage does not hide or disable work recording.
