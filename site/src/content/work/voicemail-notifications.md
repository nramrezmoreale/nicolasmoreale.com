---
title: Why voicemail emails stopped for three programs
summary: On one instance, voicemail notifications worked for three programs and never arrived for three others. Comparing the flows side by side narrowed it to a few missing attributes and the delivery mapping.
context: Pharmaceutical patient-support contact center, test environment
order: 3
stack:
  - Amazon Connect contact flows
  - Flow JSON exports
  - AWS Lambda
---

## The situation

Several programs on one Amazon Connect instance shared a voicemail flow, each with its own inbound and queue flows. In user acceptance testing, voicemail emails arrived for three programs and never arrived for the other three. Same instance, same shared flow, different results.

## What I did

- **Exported the 11 flows involved**: the failing programs' inbound and queue flows, working references for comparison, and the shared voicemail flow.
- **Compared working and failing flows block by block**: Lambda calls, contact attributes, storage and notification settings, recipients and error branches.
- **Found the differences.** One program's queue flow was missing the queue name and ARN the voicemail step depends on. The failing programs had no in-hours option to leave a voicemail. And the shared voicemail flow's branch for one program never set the queue-name attribute.
- **Ruled the flows out where they matched.** Where a failing program's configuration was identical to a working one, the cause had to live outside the flows, so I pointed the team at the queue tags and the voicemail delivery mapping.

## Outcome

- A short list of specific fixes instead of rebuilding the flows.
- A repeatable way to debug "works for A, not for B": export both, diff them, then check what lives outside the flow.
