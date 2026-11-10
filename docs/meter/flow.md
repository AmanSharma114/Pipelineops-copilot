# Meter Rollup architecture and data flow
Version 1.0

## Meter data flow
Meter gateway export → interval validation → duplicate check → hourly aggregation → facilities consumption report. Each output row contains meter, UTC hour, and total wh. The standalone batch reads a JSON array and writes its result to standard output.

## Grouping key
Group on meter ID and UTC hour. Each hour requires start times at minutes 00, 15, 30, and 45. A repeated start time with the same energy value counts once.
