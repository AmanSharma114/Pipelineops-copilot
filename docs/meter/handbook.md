# Meter Rollup handbook
Version 1.0

## Trigger and schedule
The reference schedule runs meter_rollup at ten minutes past each hour against a sealed export of quarter-hour electricity readings. Every timestamp is UTC. One batch can contain multiple meters.

## Consumers
Facilities Analytics reads the resulting meter-hour totals to compare building energy use. Consumption is measured in watt-hours; readings are interval increments.
