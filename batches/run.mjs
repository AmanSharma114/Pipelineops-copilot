import { readFile } from 'node:fs/promises';
import { rollup } from './meter/run.mjs';
import { reconcile } from './learning/run.mjs';

import { summarizeWater } from './water/run.mjs';

const jobs = new Map([['meter', rollup], ['learning', reconcile], ['water', summarizeWater]]);
const [job, input] = process.argv.slice(2);
try {
  if (!jobs.has(job)) throw Error('Usage: node batches/run.mjs <meter|learning|water> [input.json]');
  const path = input || new URL('./' + job + '/sample.json', import.meta.url);
  const rows = JSON.parse(await readFile(path, 'utf8'));
  console.log(JSON.stringify(jobs.get(job)(rows), null, 2));
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
