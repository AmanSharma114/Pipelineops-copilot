# Meter Rollup troubleshooting runbook
Version 1.0

## MR-104 incomplete hour
MR-104 means a meter-hour has fewer than four distinct quarter-hour intervals. Compare the interval starts with minutes 00, 15, 30, and 45. Request the missing reading from Meter Operations and replay the corrected export. Never substitute zero for a missing interval.

## MR-409 conflicting interval
MR-409 means two readings share a meter and interval start but disagree on watt-hours. Hold the batch and ask Meter Operations to confirm the authoritative value.
