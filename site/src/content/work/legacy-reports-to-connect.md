---
title: Reports that match the contract after leaving NICE
summary: Mapped eight legacy NICE inContact reports to Amazon Connect, and caught a service-level number that counted hang-ups as success.
context: Pharmaceutical patient-support contact center
order: 1
stack:
  - Amazon Connect historical metrics
  - Amazon Connect dashboards
  - GetMetricDataV2 API
---

## The situation

A pharmaceutical patient-support program was moving its contact center from NICE inContact to Amazon Connect. The business ran on eight legacy reports, from daily abandons to agent time cards, and had a contractual service-level target. Reports had been prepared in Connect. The open question was whether they said the same thing as the old ones.

## What I did

- **Mapped every legacy metric** to a native Connect metric, a custom dashboard metric, or a documented gap with a workaround. Some had no direct equivalent: "refused" calls became agent non-response excluding customer abandons, and "working rate" became occupancy.
- **Tested the service-level definition.** Connect's native *Service level X* counts every contact that leaves the queue within X seconds, whether an agent answered or the caller hung up. I ran 20 controlled test calls to show the effect: the 30-second service level read 100% while a quarter of the callers had abandoned.
- **Defined the contractual KPI** as contacts answered within 20 seconds, divided by contacts queued minus those abandoned within 20 seconds. I validated it against the test calls and standardized every report on the 20-second threshold the old platform used.
- **Led the internal review** and helped present the definitions to the business, so each number came with a plain-language explanation the client's team could repeat.

## Outcome

- A validated service-level KPI on Connect dashboards that measures what the contract measures.
- Reports delivered inside Amazon Connect, with no separate BI tool to license or maintain.
- A written definition for every metric, so the next "why doesn't this match?" already has an answer.

I wrote up the service-level finding in more detail: [Amazon Connect's service level can read 100% while a quarter of your callers hang up](/writing/connect-service-level-counts-abandons/).
