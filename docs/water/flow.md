# Probe telemetry architecture and data flow
Version 1.0

## Probe data flow
Probe gateway export → sequence and calibration checks → turbidity range report. The batch reads a JSON manifest with nested readings and writes the probe ID, calibration revision, sequence bounds, unique count, minimum NTU and maximum NTU to standard output.

## Replay identity
Within one probe export, seq identifies a sample. Identical repeated readings count once. Arrival order does not change the range or sample count.
