# Dispatch Board runbook
Version 1.0

## Trigger and schedule
At five minutes past each hour, board_publish checks Route Ledger for a released partition newer than the published watermark. A new partition triggers a board refresh. Without one, the previous snapshot stays visible.

## DB-410 missing release
DB-410 means no released ledger partition arrived before the 08:05 UTC dispatch cutoff. Check the release marker against the ledger partition ID. Ask Routing Operations to confirm release before retrying publication. Keep the last published snapshot visible until the marker is present.

## Safe restart
Acquire the board_publish lock. Compare the published watermark with the released ledger partition ID. Skip an already published partition. Otherwise rebuild the pending snapshot, verify one row per route, and atomically switch the board pointer before advancing the watermark.
