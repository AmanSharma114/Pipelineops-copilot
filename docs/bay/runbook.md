# Bay Planner troubleshooting runbook
Version 1.0

## BP-307 overlapping bay slots
BP-307 means two loading assignments overlap at the same bay. Inspect the conflicting route IDs and time windows in yard/rejections/<plan-id>/overlap.csv. Ask Yard Planning to correct the capacity input, then replay only the unpublished plan. Keep the previous plan visible until the collision check passes.

## Missing capacity file
If the yard-capacity file is absent, leave the plan pending. Request the file for the same yard date from the yard supervisor. Reusing a prior date can allocate a bay that is closed today.
