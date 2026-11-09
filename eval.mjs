import './build.mjs';
import { readFile } from 'node:fs/promises';

const { default: worker } = await import('./dist/server/index.js');
const cases = [];
for (const file of ['cases.json', 'three-pipeline.json', 'paraphrases.json', 'evidence.json']) {
  cases.push(...JSON.parse(await readFile(new URL('./eval/' + file, import.meta.url))));
}
let failures = 0;
for (const split of new Set(cases.map(item => item.split))) {
  let correct = 0;
  let abstentions = 0;
  let unsupported = 0;
  const group = cases.filter(item => item.split === split);
  for (const { app, question, expected } of group) {
    const url = new URL('https://eval.invalid/');
    url.search = new URLSearchParams({ app, q: question });
    const result = await worker.fetch(new Request(url)).text();
    const answer = result.match(/<section class="answer">([\s\S]*?)<\/section>/)?.[1] ?? '';
    const href = answer.match(/href="([^"]+)"/)?.[1];
    let passed = false;
    if (!expected) {
      unsupported++;
      passed = !href && answer.includes('INSUFFICIENT EVIDENCE');
      if (passed) abstentions++;
    } else if (href) {
      const citation = new URL(href, url);
      const response = await worker.fetch(new Request(citation));
      const source = await response.text();
      const fragment = source.split('id="s' + expected.section + '"')[1]?.split('</section>')[0];
      const excerpt = answer.match(/<p>(.*?)<\/p>/s)?.[0];
      passed = response.ok && citation.searchParams.get('app') === app
        && citation.searchParams.get('doc') === expected.doc && citation.hash === '#s' + expected.section
        && Boolean(excerpt && fragment?.includes(excerpt));
    }
    if (passed) correct++;
    else {
      failures++;
      console.log(`  Miss: ${app} | ${question} | ${href ?? 'no citation'}`);
    }
  }
  console.log(`${split}: ${correct}/${group.length} correct; supported ${correct-abstentions}/${group.length-unsupported}; unsupported ${abstentions}/${unsupported}`);
}
if (failures) process.exitCode = 1;
