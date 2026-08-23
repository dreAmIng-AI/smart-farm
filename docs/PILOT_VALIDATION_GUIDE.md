# v0.2 Pilot Validation Guide

**Status: TARGET GUIDE — use after real-data modules and UX are released**

## Purpose

Validate whether a farmer can use a real Farm context and official reference data without mistaking reference information for a diagnosis, prescription or sale-price prediction.

## Preparation

- One owner account and, when collaboration is in scope, one invited Farm member
- A real Pilot Farm name, approved forecast area, crop, cultivar and transplant/sowing date
- An optional real FarmArea such as `1동`, `2동`, `육묘장` or `노지 A구역`
- Confirmed server-side provider keys and real responses for the Pilot region/crop/market
- A test image under 10 MB if Attachment validation is included

Do not preload mock weather, disease, crop or market values. If a provider is unavailable, capture the fallback message as a finding.

## Test Flow

1. Register the Farm and minimum location context.
2. Add a FarmArea if it exists in the Pilot Farm.
3. Register the current cultivation context.
4. Open Today without explaining the UI.
5. Ask the participant to find today’s work and record a result.
6. Ask the participant to find current weather and identify its source/update time.
7. Ask the participant to open disease/pest information and explain what it means.
8. Ask the participant to find the market reference price and identify market/unit/base date.
9. Ask the participant to add an Observation and, if needed, mark it as an Issue needing confirmation.
10. Confirm Follow-up and History remain traceable.

## Observation Questions

| Question | Expected safe understanding |
|---|---|
| Can the user find today’s work unaided? | Yes, from the first screen. |
| Does the user know where weather is? | Yes, and can identify the source/update time. |
| Does the user understand the current cultivation? | Yes, using crop, cultivar and growth-stage wording. |
| Is a Disease/Pest card understood as a diagnosis? | No; it is read as a “check this information” reference. |
| Is market information understood as the Farm’s sale prediction? | No; it is read as market reference price with conditions. |
| Can the user record a task and a separate observation? | Yes, without a long explanation. |
| Are text size and buttons comfortable? | Yes, including for older users. |

## Result Record

| Area | Pass / fail | What confused the participant? | Evidence / reproduction | Priority |
|---|---|---|---|---|
| Today task discovery |  |  |  | P0 / P1 / P2 |
| Work result and history |  |  |  | P0 / P1 / P2 |
| Observation and issue |  |  |  | P0 / P1 / P2 |
| Weather provenance/fallback |  |  |  | P0 / P1 / P2 |
| Disease/Crop wording |  |  |  | P0 / P1 / P2 |
| Market meaning |  |  |  | P0 / P1 / P2 |
| Text size and touch targets |  |  |  | P0 / P1 / P2 |

- **P0**: data loss, incorrect access control, unsafe agricultural interpretation, or blocked work cycle
- **P1**: task completes but repeated confusion or high effort occurs
- **P2**: wording, layout or convenience improvement

## Pilot Readiness

`READY` requires a real Farm to complete the full v0.2 flow with real sources and honest failure states. Until FarmArea, Observation/Measurement and all baseline source modules are implemented and validated, report `PARTIAL`, not `READY`.
