# Gate reconciliation SOP
Version 1.0

## Safe restart
Check that the gate_reconcile lease has expired and capture the last committed event offset. Replay the affected gate batch against its original released bay plan. Deduplicate by gate event ID and advance the offset only after the departure-status write commits.

## Count verification
Compare the input batch count with the sum of matched, duplicate, and pending event counts. Stop publication if the counts disagree. Record the gate batch ID and plan ID with the reconciliation report.
