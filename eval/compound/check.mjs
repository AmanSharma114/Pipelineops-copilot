import '../../build.mjs';
import { readFile } from 'node:fs/promises';

const { default: worker } = await import('../../dist/server/index.js');
const cases = JSON.parse(await readFile(new URL('questions.json', import.meta.url), 'utf8'));
let complete = 0;
let supported = 0;
let citations = 0;
let unsupported = 0;
let abstentions = 0;
let partial = 0;
let completePartial = 0;

async function checkPart(part, expected, requestUrl) {
  if (!part) return false;
  const links = [...part.matchAll(/<a href="([^"]+)"/g)];
  if (expected === null) return links.length === 0 && part.includes('INSUFFICIENT EVIDENCE');
  if (links.length !== 1 || !part.includes('SOURCE EXCERPT')) return false;
  const [doc, section] = expected.split('#');
  const sourceUrl = new URL(links[0][1], requestUrl);
  if (sourceUrl.origin !== requestUrl.origin || sourceUrl.pathname !== '/source'
      || sourceUrl.searchParams.get('app') !== requestUrl.searchParams.get('app')
      || sourceUrl.searchParams.get('q') !== requestUrl.searchParams.get('q')
      || sourceUrl.searchParams.get('doc') !== doc || !sourceUrl.searchParams.get('v')
      || sourceUrl.hash !== '#s' + section) return false;
  const response = await worker.fetch(new Request(sourceUrl));
  const source = await response.text();
  const fragment = source.split('id="s' + section + '"')[1]?.split('</section>')[0];
  const excerpt = part.match(/<p>.*?<\/p>/s)?.[0];
  return response.ok && Boolean(excerpt && fragment?.includes(excerpt));
}

for (const { app, question, expected } of cases) {
  const url = new URL('https://eval.invalid/');
  url.search = new URLSearchParams({app, q: question});
  const response = await worker.fetch(new Request(url));
  const html = await response.text();
  const parts = [...html.matchAll(/<section class="answer">([\s\S]*?)<\/section>/g)].map(match => match[1]);
  let passed = response.ok && parts.length === expected.length;
  const isPartial = expected.includes(null) && expected.some(Boolean);
  if (isPartial) partial++;
  for (const [i, target] of expected.entries()) {
    const ok = await checkPart(parts[i], target, url);
    if (target === null) {
      unsupported++;
      if (ok) abstentions++;
    } else {
      supported++;
      if (ok) citations++;
    }
    if (!ok) console.log(`Miss: ${app} | part ${i + 1} | ${question}`);
    passed &&= ok;
  }
  if (passed) complete++;
  if (passed && isPartial) completePartial++;
}
console.log(`Complete questions: ${complete}/${cases.length}; verified citations: ${citations}/${supported}; correct abstentions: ${abstentions}/${unsupported}; complete partial answers: ${completePartial}/${partial}`);
if (complete !== cases.length) process.exitCode = 1;
