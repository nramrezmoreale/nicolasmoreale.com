---
title: Amazon Connect's service level can read 100% while a quarter of your callers hang up
description: Service level X counts abandoned calls the same as calls answered in time. A 20-call test shows the effect, and three native metrics give you the number to report instead.
pubDate: 2026-10-19
---

If you report *Service level 30 seconds* from Amazon Connect to a client or against a contract, check what it counts. It may not be what anyone in the room thinks it is.

## What the metric measures

The [AWS definition](https://docs.aws.amazon.com/connect/latest/adminguide/metrics-definitions.html#service-level) is the percentage of queued contacts that were *removed from the queue* within X seconds. A contact leaves the queue when an agent answers it, when the caller abandons, or when the caller asks for a callback.

So a caller who hangs up after 10 seconds counts toward your 20-second service level exactly like a caller an agent picked up after 10 seconds.

Most legacy platforms, and most contracts, mean something else: the share of callers who were *answered* within X seconds, usually leaving out very short abandons.

## A 20-call test

I placed 20 test calls into one queue and controlled when each was answered or abandoned:

- 15 calls answered: 14 within 15 seconds, all 15 within 20 seconds
- 5 calls abandoned: 3 between 20 and 25 seconds, the other 2 between 25 and 30 seconds

| Metric | Result |
| --- | --- |
| Answer rate | 75% (15 of 20) |
| Abandonment rate | 25% (5 of 20) |
| Service level 15 seconds | 70% |
| Service level 20 seconds | 75% |
| Service level 25 seconds | 90% |
| Service level 30 seconds | **100%** |

The 30-second service level is perfect while one caller in four gave up. Every abandon between 20 and 30 seconds pushed the number *up*.

## What to report instead

For a contract that means "answered within 20 seconds", build the number from its parts:

```
answered within 20 s / (queued - abandoned within 20 s)
```

All three parts are native Amazon Connect metrics: *Contacts answered in X seconds*, *Contacts queued* and *Contacts abandoned in X seconds*. Both "in X seconds" metrics accept custom thresholds, so you can match whatever your contract treats as a short abandon. In the GetMetricDataV2 API they are `SUM_CONTACTS_ANSWERED_IN_X`, `CONTACTS_QUEUED` and `SUM_CONTACTS_ABANDONED_IN_X`.

In the test above that comes to 15 / (20 - 0) = 75%, which tells the same story as the answer rate instead of hiding it. You can build it as a custom metric on an Amazon Connect dashboard, or compute it from the API if you report somewhere else.

## Three things to settle before you report anything

1. **Pick one short-abandon threshold and use it everywhere.** Reports built at 15 seconds and 20 seconds will never agree. Use the value your previous platform and your contract use.
2. **Write the definition next to the number.** "Service level" means different things on different platforms. One sentence under the chart saves a meeting.
3. **Test with calls you control.** Twenty calls with known outcomes take about an hour, and they settle the argument with evidence instead of opinions.

If your Connect numbers don't match your old platform or your contract, [I can help you find out why](/contact/).
