# Learning Completion Sync troubleshooting runbook
Version 1.0

## LC-409 conflicting revision
LC-409 means two events for the same learner, course, and revision disagree on status. Hold publication and have Learning Systems confirm the authoritative status. Rerun the corrected export. A matching duplicate is safe to replay.

## Invalid enrollment status
Only assigned, completed, and revoked are accepted. Request a corrected source value for any other status; do not silently map an unknown state to completed.
