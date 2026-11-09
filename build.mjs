import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { readCurrentDocuments } from './sync.mjs';

export const docs = await readCurrentDocuments('docs');
const source = await readFile('worker.js','utf8');
const css = await readFile('style.css','utf8');
await mkdir('dist/server',{recursive:true});
const staged = 'dist/server/' + randomUUID() + '.tmp';
try {
  await writeFile(staged, 'const documents = ' + JSON.stringify(docs) + ';\nconst css = ' + JSON.stringify(css) + ';\n' + source);
  await rename(staged, 'dist/server/index.js');
} finally {
  await rm(staged, { force: true });
}
