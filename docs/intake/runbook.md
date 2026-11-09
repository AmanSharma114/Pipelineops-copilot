# Carrier intake runbook
Version 1.2

## Trigger and schedule
Carrier Intake starts when the carrier uploads a manifest and its matching ready marker to inbound/carrier/. The watcher checks every five minutes. A manifest alone cannot trigger intake.

## CI-204 missing delivery
CI-204 means the expected ready marker is absent at the 06:15 UTC delivery deadline. Compare the manifest batch ID with the marker filename. Ask Carrier Operations to resend the matching marker. Never manufacture a marker to bypass the check.

## Safe restart
Pause the watcher and check the batch ledger for the manifest ID. If the batch is committed, skip replay. Otherwise discard only that batch's staging partition, replay carrier_load with the same manifest ID, and resume the watcher after the committed row count matches the manifest.

## Downstream dependency
Carrier Intake publishes validated scans to freight.scan_events. Route Ledger consumes only committed batches from this table.
