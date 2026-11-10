# Departure Monitor troubleshooting runbook
Version 1.0

## GM-307 unmatched gate departure
GM-307 means a gate event refers to a route missing from the referenced bay plan. Inspect freight.gate_pending for the captured plan ID. Ask Yard Planning to confirm the released assignment. After confirmation, replay the pending event by gate event ID without altering its timestamp.

## Stalled event offset
A committed departure with an unchanged offset can be delivered again. Compare the gate batch ID with the write audit and rerun the idempotent reconciliation. Never advance the offset past uncommitted events.
