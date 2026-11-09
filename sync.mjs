import { readdir, readFile, mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import { join } from 'node:path';

function parseRevision(app, filename, raw) {
  const name = /^([a-z0-9-]+)(?:@([\d.]+))?\.md$/.exec(filename);
  const [header, ...parts] = raw.trim().split(/^## /m);
  const metadata = /^# ([^\r\n]+)\r?\nVersion ((?:0|[1-9]\d*)\.(?:0|[1-9]\d*))(?:\r?\nStatus (retired))?\s*$/.exec(header);
  const retired = metadata?.[3] === 'retired';
  if (!name || !metadata || (retired ? parts.length > 0 : parts.length === 0) || (name[2] && name[2] !== metadata[2])) {
    throw Error('Invalid document revision: ' + app + '/' + filename);
  }
  const sections = parts.map(part => {
    const [title, ...lines] = part.split(/\r?\n/);
    const body = lines.join('\n').trim();
    if (!title.trim() || !body) throw Error('Empty section in ' + filename);
    return { title: title.trim(), body };
  });
  return { app, id: name[1], title: metadata[1], version: metadata[2], sections, retired };
}

function newestFirst(left, right) {
  const before = left.version.split('.').map(BigInt);
  const after = right.version.split('.').map(BigInt);
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== after[i]) return before[i] > after[i] ? -1 : 1;
  }
  return 0;
}

const digest = value => createHash('sha256').update(value).digest('hex');

async function loadCache(path) {
  try {
    const { payload, checksum } = JSON.parse(await readFile(path, 'utf8'));
    if (typeof payload === 'string' && digest(payload) === checksum) {
      return new Map(JSON.parse(payload));
    }
  } catch (error) {
    if (error.code && error.code !== 'ENOENT') throw error;
  }
  return new Map();
}

export async function readCurrentDocuments(root, cacheDirectory) {
  // A parser edit invalidates existing entries even when Markdown is unchanged.
  const schema = digest(await readFile(new URL(import.meta.url)));
  const cachePath = join(cacheDirectory, 'revisions.json');
  const cached = await loadCache(cachePath);
  const next = new Map();
  let parsed = 0;
  const groups = new Map();
  for (const app of (await readdir(root)).sort()) {
    for (const file of (await readdir(join(root, app))).sort()) {
      const raw = await readFile(join(root, app, file), 'utf8');
      const keyForFile = app + '/' + file;
      const fingerprint = digest(schema + raw);
      let entry = cached.get(keyForFile);
      if (entry?.fingerprint !== fingerprint) {
        entry = { fingerprint, revision: parseRevision(app, file, raw) };
        parsed++;
      }
      next.set(keyForFile, entry);
      const { revision } = entry;
      const key = app + '/' + revision.id;
      if (!groups.has(key)) groups.set(key, []);
      const revisions = groups.get(key);
      if (revisions.some(doc => doc.version === revision.version)) {
        throw Error('Duplicate revision: ' + key + ' v' + revision.version);
      }
      revisions.push(revision);
    }
  }
  const documents = [...groups.values()].map(revisions => {
    revisions.sort(newestFirst);
    const [current, previous] = revisions;
    if (current.retired) {
      return { ...current, versions: revisions.map(revision => revision.version) };
    }
    return previous ? { ...current, supersedes: previous.version } : current;
  });
  if (parsed || next.size !== cached.size) {
    await mkdir(cacheDirectory, {recursive: true});
    const temporary = join(cacheDirectory, randomUUID() + '.tmp');
    const payload = JSON.stringify([...next]);
    try {
      await writeFile(temporary, JSON.stringify({payload, checksum: digest(payload)}));
      await rename(temporary, cachePath);
    } finally {
      await rm(temporary, {force: true});
    }
  }
  return { documents, parsed, reused: next.size - parsed };
}
