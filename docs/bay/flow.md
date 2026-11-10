# Bay Planner architecture and data flow
Version 1.0

## Allocation data flow
Dispatch Board publishes freight.dispatch_snapshot. The allocator joins its active routes to yard/capacity/<yard-date>.csv by yard ID and equipment class. It writes draft slots to freight.bay_draft, validates exclusive occupancy, and releases freight.bay_assignments as a single plan.

## Capacity validation
Reject a capacity file with duplicate bay IDs or a negative slot length. Preserve the original file and record its checksum in the release ledger alongside the dispatch snapshot ID.
