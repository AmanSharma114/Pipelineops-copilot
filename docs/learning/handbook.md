# Learning Completion Sync handbook
Version 1.0

## Trigger and schedule
The reference schedule runs learning_sync each day at 02:00 UTC after the learning platform seals its event export. The export contains synthetic learner IDs, course codes, revision numbers, and enrollment statuses.

## Consumers
Training Administration uses the enrollment register to review assigned, completed, and revoked courses. Each learner-course pair appears once, with its highest observed revision.
