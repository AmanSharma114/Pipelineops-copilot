# Gate operator shift notes
Version 1.0

## GX-912 replay audit mismatch
GX-912 indicates a disagreement between the gate replay audit and the committed event offset. An authorized gate operator checks the synthetic audit view freight.gate_replay_audit before handing the batch to Gate Operations for reconciliation.
