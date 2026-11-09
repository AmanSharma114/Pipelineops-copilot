# Carrier scan data-flow specification
Version 1.0

## Staging input
After the ready marker matches the manifest ID, carrier_load reads the listed scan files into freight.scan_stage under that batch ID. Rows remain in staging until the entire batch passes validation.

## CI-422 row count mismatch
CI-422 means the staged row count differs from the manifest's declared scan count. Compare the per-file counts with the manifest inventory to locate missing or truncated input. The job leaves the batch uncommitted and writes its rejection report to quarantine/carrier/<batch-id>/counts.json. Carrier Operations supplies corrected input before the batch is replayed.

## Duplicate scan IDs
Within a batch, each scan_id must occur exactly once. Reject the entire batch when an ID repeats, even when both rows are identical. Record the repeated identifier and the two input filenames in the rejection report so Carrier Operations can trace the duplicate.
