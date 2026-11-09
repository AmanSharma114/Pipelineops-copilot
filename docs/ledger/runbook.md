# Route ledger runbook
Version 2.1

## Trigger and schedule
Route Ledger polls freight.scan_events at 15 and 45 minutes past each hour. A committed Carrier Intake batch above the ledger watermark triggers route_merge.

## RL-410 duplicate sequence
RL-410 means two scans share a route ID and sequence number but disagree on stop ID. Quarantine the conflicting pair and ask Routing Operations to confirm the authoritative stop before replay.

## Safe restart
Check the route_merge lock and wait for any active writer to finish. Replay the quarantined batch from its last committed watermark. Verify one row per route ID and sequence number before releasing the ledger partition.

## Support ownership
Routing Operations owns Route Ledger and approves corrections to conflicting stop IDs. Carrier Operations handles upstream manifest delivery.
