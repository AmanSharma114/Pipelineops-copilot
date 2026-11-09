import { readFile, mkdir, writeFile, rename, rm } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { pathToFileURL } from 'node:url';
import { readCurrentDocuments } from './sync.mjs';

const {documents: catalog, parsed, reused} = await readCurrentDocuments('docs', '.sync-cache');
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(`Document revisions: ${parsed} parsed, ${reused} reused`);
}
export const docs = catalog.filter(doc => !doc.retired);
const withdrawals = catalog.filter(doc => doc.retired);
const source = await readFile('worker.js','utf8');
const css = await readFile('style.css','utf8');
await mkdir('dist/server',{recursive:true});
const staged = 'dist/server/' + randomUUID() + '.tmp';
try {
  await writeFile(staged, 'const documents = ' + JSON.stringify(docs) + ';\nconst withdrawals = ' + JSON.stringify(withdrawals) + ';\nconst css = ' + JSON.stringify(css) + ';\n' + source);
  await rename(staged, 'dist/server/index.js');
} finally {
  await rm(staged, { force: true });
}
