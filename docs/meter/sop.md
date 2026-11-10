# Meter Rollup operating procedure
Version 1.0

## Safe restart
Retain the sealed input export. Correct the rejected intervals with Meter Operations, then rerun meter_rollup on the entire corrected export. Publish the complete result only after the batch exits successfully.

## Verification
Compare the number of output rows with the distinct meter-hour keys. For the sample meter MTR-07, the four unique readings sum to 750 Wh. The repeated 09:30 interval contributes once.
