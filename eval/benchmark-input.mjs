// Run from the project root. Exercise the deployed handler for the lexical baseline.
import { docs } from '../build.mjs';
import { readFile } from 'node:fs/promises';
const { default: worker, questionFact } = await import('../dist/server/index.js');
const questions = [];
for (const file of ['cases.json', 'three-pipeline.json', 'paraphrases.json', 'evidence.json', 'validation.json', 'cadence.json', 'writer-recovery.json', 'code-lookup.json', 'deadlines.json']) {
  const rows = JSON.parse(await readFile(new URL(file, import.meta.url)));
  for (const row of rows) {
    const url = new URL('https://benchmark.invalid/');
    url.search = new URLSearchParams({app: row.app, q: row.question});
    const html = await worker.fetch(new Request(url)).text();
    const answer = html.match(/<section class="answer">([\s\S]*?)<\/section>/)[1];
    const link = answer.match(/href="([^"]+)"/);
    let lexical = null;
    if (link) {
      const source = new URL(link[1], url);
      if (source.searchParams.get('app') !== row.app) throw Error('Cross-pipeline citation');
      lexical = { doc: source.searchParams.get('doc'), section: Number(source.hash.slice(2)) };
    } else if (!answer.includes('INSUFFICIENT EVIDENCE')) throw Error('Missing answer state');
    questions.push({...row, lexical, requiredFact: questionFact(row.question)});
  }
}
console.log(JSON.stringify({docs, questions}));
