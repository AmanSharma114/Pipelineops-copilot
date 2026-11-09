import '../build.mjs';
import { performance } from 'node:perf_hooks';
import { loadQuestions } from './fixtures.mjs';

const { default: worker } = await import('../dist/server/index.js');
const questions = await loadQuestions();
const urls = questions.map(({app, question}) =>
  'https://benchmark.invalid/?' + new URLSearchParams({app, q: question}));

// One complete warm-up pass followed by ten measured passes, all sequential.
const samples = [];
for (let pass = 0; pass <= 10; pass++) {
  for (const url of urls) {
    const request = new Request(url);
    const start = performance.now();
    const response = await worker.fetch(request);
    const body = await response.text();
    const elapsed = performance.now() - start;
    if (!response.ok || !body.includes('<section class="answer">')) {
      throw Error('Unexpected answer response for ' + url);
    }
    if (pass > 0) samples.push(elapsed);
  }
}
samples.sort((a, b) => a - b);
const percentile = p => samples[Math.ceil(samples.length * p) - 1];
console.log(JSON.stringify({
  runtime: process.version, platform: process.platform, arch: process.arch,
  questions: questions.length, warmupRequests: urls.length, timedRequests: samples.length,
  localHandlerMs: { p50: +percentile(0.50).toFixed(3), p95: +percentile(0.95).toFixed(3) }
}, null, 2));
