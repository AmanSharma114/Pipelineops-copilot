import '../build.mjs';
import { pathToFileURL } from 'node:url';

const { default: desk } = await import('../dist/server/index.js');
export const example = 'What should I do when Dispatch Board misses its cutoff, and who can approve manual publication?';
const origin = 'https://pipelineops-freight-copilot.aamansharmamu114.chatgpt.site';
const decode = text => text.replace(/&(?:amp|lt|gt|quot|#39);/g, entity =>
  ({'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"}[entity]));

// Run the public request handler in-process. The adapter has no privileged credentials.
export async function retrieve(app, question) {
  const url = new URL('/', origin);
  url.search = new URLSearchParams({app, q:question});
  const response = await desk.fetch(new Request(url));
  if (!response.ok) throw Error(await response.text());
  const html = await response.text();
  const parts = [...html.matchAll(/(?:<h2 class="clause"[^>]*>([^<]*)<\/h2>)?<section class="answer">([\s\S]*?)<\/section>/g)];
  if (!parts.length) throw Error('Expected an answer. Supply a nonempty question.');
  return parts.map(([, label, body]) => {
    const part = decode(label || '') || question;
    if (body.includes('<small>INSUFFICIENT EVIDENCE</small>')) return {part};
    const match = body.match(/<p>(.*?)<\/p><a href="([^"]+)">/s);
    if (!match) throw Error('Unrecognized citation markup');
    const citation = new URL(decode(match[2]), origin);
    if (citation.origin !== origin || citation.pathname !== '/source' ||
        citation.searchParams.get('app') !== app) throw Error('Unexpected citation scope');
    return {part, passage:decode(match[1]), citation:citation.href};
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    console.log(JSON.stringify(await retrieve(process.argv[2] || 'dispatch', process.argv.slice(3).join(' ') || example), null, 2));
  } catch (error) {
    console.error('Local RAG failed:', error.message);
    process.exitCode = 1;
  }
}
