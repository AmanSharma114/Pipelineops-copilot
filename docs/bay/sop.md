# Bay allocation SOP
Version 1.0

## Safe restart
Pause the allocator for the yard date. Compare the dispatch snapshot ID with the release ledger. Skip a released plan. For an unpublished plan, discard only its draft rows, replay bay_allocate with the original capacity file, and verify the collision check before switching the release pointer.

## Collision check
For each bay, sort allocations by start time. The next slot may start at the previous slot's end, but cannot start earlier. Withhold the entire plan when any two intervals overlap.
