# Water Quality Monitor troubleshooting runbook
Version 1.0

## WQ-104 missing probe sequence
WQ-104 means at least one sequence in the sealed manifest range is absent. Compare the unique sequence IDs against both declared bounds. Request a complete export from Instrument Operations and replay it. Keep the previous report available until the replacement passes.

## WQ-208 calibration mismatch
WQ-208 means a reading's calibration revision differs from the revision declared in the manifest. Quarantine the batch and ask Instrument Operations to verify the probe configuration before requesting a corrected export.

## WQ-409 conflicting sample
WQ-409 means the same sample sequence carries two different turbidity values. Retain both records and request an authoritative gateway export. Selecting a value by arrival order would make replay inconsistent.
