# Bay Planner handbook
Version 1.0

## Trigger and schedule
Bay Planner checks the current Dispatch Board pointer every ten minutes. A new published snapshot and a matching yard-capacity file trigger bay_allocate. Without both inputs the planner keeps the last released plan.

## Output and consumers
Yard supervisors read freight.bay_assignments to stage outbound loads. Departure Monitor reads the same released plan to match gate events with planned routes. A plan is identified by yard date and dispatch snapshot ID.
