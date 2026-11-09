# Dispatch Board handbook
Version 1.0

## Support ownership
Dispatch Operations owns the board and approves manual publication. Routing Operations owns the upstream ledger partition and confirms its release marker during an incident.

## Output and consumers
The dispatch console reads freight.dispatch_snapshot through the current board pointer. Each snapshot contains the latest stop for every active route. Dispatch supervisors use it to assign loading bays.
