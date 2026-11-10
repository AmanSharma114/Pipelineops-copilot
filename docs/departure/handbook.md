# Departure Monitor handbook
Version 1.0

## Trigger and schedule
Departure Monitor polls the gate event inbox every two minutes. gate_reconcile processes a completed event batch only after Bay Planner has released the referenced plan ID. Unmatched events stay pending.

## Service output
The transport desk reads freight.departure_status to see planned, departed, or pending routes. Gate timestamps are UTC. A delayed scan can move a route from pending to departed after reconciliation.
