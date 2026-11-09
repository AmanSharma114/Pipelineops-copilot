# Dispatch Board runbook
Version 1.1

## Trigger and schedule
At five minutes past each hour, board_publish checks Route Ledger for a released partition newer than the published watermark. A new partition triggers a board refresh. Without one, the previous snapshot stays visible.

## DB-410 missing release
DB-410 indicates a missed upstream release. The morning dispatch cutoff is 08:05 UTC. If the released ledger partition is late, the board remains visible with the last published snapshot, regardless of its date. Check the release marker against the ledger partition ID. Ask Routing Operations to confirm release before retrying publication. Leave the board pointer unchanged until the marker is present.

## Safe restart
Acquire the board_publish lock. Compare the published watermark with the released ledger partition ID. Skip an already published partition. Otherwise rebuild the pending snapshot, verify one row per route, and atomically switch the board pointer before advancing the watermark.
