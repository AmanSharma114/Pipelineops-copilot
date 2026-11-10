# Learning Completion Sync architecture and data flow
Version 1.0

## Enrollment data flow
Learning platform export → schema validation → revision reconciliation → enrollment register. The standalone batch reads a JSON array and writes one row per learner-course pair to standard output. Event arrival order does not determine the final state.

## Revocation handling
Keep revoked as the final status if it belongs to the highest revision. An older completion delivered later cannot restore that enrollment.
