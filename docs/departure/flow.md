# Departure Monitor architecture and data flow
Version 1.0

## Gate event data flow
Gate readers write batches under gate/inbox/<yard-date>/. gate_reconcile joins each event to freight.bay_assignments by plan ID and route ID. It writes matched departures to freight.departure_status and unmatched events to freight.gate_pending.

## Event identity
A gate event ID identifies one physical scan. Repeated IDs with the same payload count as duplicates. Conflicting payloads for the same ID are quarantined for Gate Operations review before replay.
