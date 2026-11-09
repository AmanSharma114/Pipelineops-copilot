import { readdir, readFile, mkdir, writeFile } from 'node:fs/promises';
export const docs = [];
for (const app of await readdir('docs')) {
  for (const file of await readdir('docs/' + app)) {
    const raw = await readFile('docs/' + app + '/' + file, 'utf8');
    const [header, ...parts] = raw.trim().split(/^## /m);
    const metadata = /^# (.+)\r?\nVersion ([\d.]+)\s*$/.exec(header);
    if (!metadata || !parts.length) throw Error('Invalid document: ' + file);
    const sections = parts.map(part => {
      const [title, ...lines] = part.trim().split(/\r?\n/);
      const body = lines.join('\n').trim();
      if (!body) throw Error('Empty section: ' + title);
      return { title, body };
    });
    docs.push({ app, id: file.replace(/\.md$/, ''), title: metadata[1], version: metadata[2], sections });
  }
}
const source = await readFile('worker.js','utf8');
const css = await readFile('style.css','utf8');
await mkdir('dist/server',{recursive:true});
await writeFile('dist/server/index.js', 'const documents = ' + JSON.stringify(docs) + ';\nconst css = ' + JSON.stringify(css) + ';\n' + source);
