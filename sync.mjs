import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

function parseRevision(app, filename, raw) {
  const name = /^([a-z0-9-]+)(?:@([\d.]+))?\.md$/.exec(filename);
  const [header, ...parts] = raw.trim().split(/^## /m);
  const metadata = /^# ([^\r\n]+)\r?\nVersion ((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))\s*$/.exec(header);
  if (!name || !metadata || !parts.length || (name[2] && name[2] !== metadata[2])) {
    throw Error('Invalid document revision: ' + app + '/' + filename);
  }
  const sections = parts.map(part => {
    const [title, ...lines] = part.split(/\r?\n/);
    const body = lines.join('\n').trim();
    if (!title.trim() || !body) throw Error('Empty section in ' + filename);
    return { title: title.trim(), body };
  });
  return { app, id: name[1], title: metadata[1], version: metadata[2], sections };
}

function newestFirst(left, right) {
  const before = left.version.split('.').map(BigInt);
  const after = right.version.split('.').map(BigInt);
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) return before[i] > after[i] ? -1 : 1;
  }
  return 0;
}

export async function readCurrentDocuments(root) {
  const groups = new Map();
  for (const app of (await readdir(root)).sort()) {
    for (const file of (await readdir(join(root, app))).sort()) {
      const revision = parseRevision(app, file, await readFile(join(root, app, file), 'utf8'));
      const key = app + '/' + revision.id;
      if (!groups.has(key)) groups.set(key, []);
      const revisions = groups.get(key);
      if (revisions.some(doc => doc.version === revision.version)) {
        throw Error('Duplicate revision: ' + key + ' v' + revision.version);
      }
      revisions.push(revision);
    }
  }
  return [...groups.values()].map(revisions => {
    revisions.sort(newestFirst);
    const [current, previous] = revisions;
    return previous ? { ...current, supersedes: previous.version } : current;
  });
}
