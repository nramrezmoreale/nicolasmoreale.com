---
title: After-call notes that supervisors can actually read
summary: Agents' notes lived in contact attributes that supervisors couldn't export. I set up the Amazon Connect data lake and scheduled CSV reports by email.
context: Pharmaceutical patient-support contact center
order: 2
stack:
  - Amazon Connect data lake
  - Amazon Athena
  - Amazon S3
---

## The situation

Agents write a note at the end of every call, during after-contact work. Supervisors needed to review those notes alongside the call type, the agent and who called. They only had access to Amazon Connect, and Contact Search didn't let them view or export the notes the way they needed.

## What I did

- **Raised a feature request with AWS** to show notes and call types in Contact Search, the long-term fix.
- **Set up the Amazon Connect data lake** as the interim path, with its own Athena workgroup and results bucket so the reporting queries stay separate from everything else in the account.
- **Wrote the queries** that pull each contact's notes, call-type attributes, agent and caller details.
- **Scheduled the reports** as CSV files sent to supervisors by email: a daily file covering the previous day, and a weekly export per program.

## Outcome

- Supervisors get the notes in their inbox, with no new tools and no extra access to manage.
- A queryable history of every contact's notes, ready for trend reporting later.
- A setup that extends to other programs as they need it.
