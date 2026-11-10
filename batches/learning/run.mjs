// Keep the latest revision for each learner/course pair in the supplied export.
export function reconcile(events) {
  if (!Array.isArray(events) || !events.length) throw Error('Empty learning export');
  const enrollments = new Map();
  for (const {learner, course, revision, status} of events) {
    if (![learner, course].every(value => typeof value === 'string' && value.trim())
        || !Number.isSafeInteger(revision) || revision < 1
        || !['assigned','completed','revoked'].includes(status)) throw Error('Invalid learning event');
    const key = JSON.stringify([learner, course]);
    if (!enrollments.has(key)) enrollments.set(key, {learner, course, revisions: new Map(), latest: 0});
    const enrollment = enrollments.get(key);
    const prior = enrollment.revisions.get(revision);
    if (prior && prior !== status) throw Error('LC-409 conflicting revision');
    enrollment.revisions.set(revision, status);
    enrollment.latest = Math.max(enrollment.latest, revision);
  }
  return [...enrollments.values()].map(({learner, course, revisions, latest}) =>
    ({learner, course, revision: latest, status: revisions.get(latest)})
  ).sort((a,b) => a.learner.localeCompare(b.learner) || a.course.localeCompare(b.course));
}
