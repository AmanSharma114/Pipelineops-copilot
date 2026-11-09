import './build.mjs';
const { default: worker } = await import('./dist/server/index.js');
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readCurrentDocuments } from './sync.mjs';

test('Incremental parsing handles warm replay, same-size edits, deletion and damaged cache', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pipelineops-cache-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const folder = join(root, 'docs/intake');
  const cache = join(root, 'cache');
  await mkdir(folder, {recursive: true});
  const run = () => readCurrentDocuments(join(root, 'docs'), cache);
  const policy = join(folder, 'retention.md');
  const original = await readFile('docs/intake/retention.md', 'utf8');
  await writeFile(policy, original);
  await cp('docs/intake/runbook.md', join(folder, 'runbook.md'));
  assert.equal((await run()).parsed, 2);
  assert.equal((await run()).reused, 2);
  await writeFile(policy, original.replace('14 days', '28 days'));
  const edited = await run();
  assert.equal(edited.parsed, 1);
  assert.equal(edited.reused, 1);
  assert.match(edited.documents.find(doc => doc.id === 'retention').sections[0].body, /28 days/);
  await rm(policy);
  const removed = await run();
  assert.deepEqual(removed.documents.map(doc => doc.id), ['runbook']);
  assert.equal(removed.parsed, 0);
  await writeFile(join(cache, 'revisions.json'), '{broken');
  assert.equal((await run()).parsed, 1);
});

test('Sync replaces a version, replays identically and preserves the worker on ingest failure', async t => {
  const root = await mkdtemp(join(tmpdir(), 'pipelineops-sync-'));
  t.after(() => rm(root, {recursive: true, force: true}));
  const intake = join(root, 'docs/intake');
  await mkdir(intake, {recursive: true});
  for (const file of ['worker.js', 'style.css', 'package.json']) await cp(file, join(root, file));
  await cp('docs/intake/retention.md', join(intake, 'retention.md'));
  const build = () => execFileSync(process.execPath, [resolve('build.mjs')], {cwd: root, stdio: 'pipe'});
  const artifact = join(root, 'dist/server/index.js');
  async function answer(revision) {
    const {default: app} = await import(pathToFileURL(artifact).href + '?revision=' + revision);
    return app.fetch(new Request('https://test.invalid/?app=intake&q=How+long+do+we+keep+manifests')).text();
  }
  build();
  assert.match(await answer(1), /retains inbound manifests for 14 days/);
  const update = (await readFile('docs/intake/retention@1.1.md', 'utf8')).replace('Version 1.1', 'Version 1.10');
  await cp('docs/intake/retention@1.1.md', join(intake, 'retention@1.1.md'));
  await writeFile(join(intake, 'retention@1.10.md'), update);
  build();
  const result = await answer(2);
  assert.match(result, /doc=retention&v=1\.10#s0/);
  assert.match(result, /retains inbound manifests for 21 days/);
  const snapshot = await readFile(artifact, 'utf8');
  assert.ok(!snapshot.includes('manifests for 14 days'));
  build();
  assert.equal(await readFile(artifact, 'utf8'), snapshot);
  await writeFile(join(intake, 'retention@2.0.md'), update);
  assert.throws(build);
  assert.equal(await readFile(artifact, 'utf8'), snapshot);
  await writeFile(join(intake, 'retention@2.0.md'), '# Inbound file policy\nVersion 2.0\nStatus retired\n');
  build();
  assert.match(await answer(3), /INSUFFICIENT EVIDENCE/);
  const withdrawn = await readFile(artifact, 'utf8');
  assert.ok(!withdrawn.includes('retains inbound manifests'));
  build();
  assert.equal(await readFile(artifact, 'utf8'), withdrawn);
});

test('Retired evidence is absent from search and its known citations explain withdrawal', async () => {
  const desk = await get('/?app=dispatch').text();
  assert.ok(desk.includes('Retired document'));
  assert.ok(!desk.includes('legacy dispatch register'));
  assert.match(await ask('dispatch', 'What does DH-118 mean?'), /INSUFFICIENT EVIDENCE/);
  for (const version of ['1.0', '1.1']) {
    const response = get('/source?app=dispatch&doc=handoff&v=' + version);
    assert.equal(response.status, 410);
    const notice = await response.text();
    assert.ok(notice.includes('Retired at v1.1'));
    assert.ok(notice.includes('View current Dispatch Board sources'));
    assert.ok(!notice.includes('legacy dispatch register'));
  }
  assert.equal(get('/source?app=intake&doc=handoff&v=1.0').status, 404);
  assert.equal(get('/source?app=dispatch&doc=handoff&v=9.9').status, 404);
});

test('Retention answers identify the item, period, and versioned source', async () => {
  const html = await ask('intake', 'How long do we keep inbound manifests?');
  assert.match(html, /retains inbound manifests for 21 days/);
  assert.match(html, /doc=retention&v=1\.1#s0/);
  for (const [app, question] of [
    ['intake', 'What is the retention period for the batch ledger?'],
    ['dispatch', 'How long is the published snapshot retained?'],
    ['ledger', 'How long are inbound manifests retained?']
  ]) assert.match(await ask(app, question), /INSUFFICIENT EVIDENCE/);
});

test('Approval requires a matching action in the selected application', async () => {
  assert.match(await ask('dispatch', 'Who authorizes manual publication?'), /doc=handbook&v=1\.1#s0/);
  assert.match(await ask('dispatch', 'Who signs off on publishing the board manually?'), /Dispatch Operations owns the board/);
  assert.match(await ask('dispatch', 'Who approves the board?'), /INSUFFICIENT EVIDENCE/);
  assert.match(await ask('ledger', 'Who approves deleting incorrect stop IDs?'), /INSUFFICIENT EVIDENCE/);
  for (const question of ['Who approves overtime for the routing team?', 'Who approves Route Ledger?']) {
    assert.match(await ask('ledger', question), /INSUFFICIENT EVIDENCE/);
  }
});
const get = path => worker.fetch(new Request('https://test.invalid' + path));
test('Index status reflects deployed versions and links only within its pipeline', async () => {
  for (const [app, counts] of [['dispatch', [2,5,1]], ['intake', [3,8,0]], ['ledger', [1,4,0]]]) {
    const path = '/index-status?app=' + app;
    assert.ok((await get('/?app=' + app).text()).includes('href="' + path + '"'));
    const html = await get(path).text();
    assert.deepEqual([...html.matchAll(/<dd>(\d+)<\/dd>/g)].map(match => Number(match[1])), counts);
    const links = [...html.matchAll(/href="(\/source\?[^"]+)"/g)].map(match => match[1]);
    assert.equal(links.length, counts[0] + counts[2]);
    for (const link of links) {
      assert.equal(new URL(link, 'https://test.invalid').searchParams.get('app'), app);
      assert.equal(get(link).status, link.includes('doc=handoff') ? 410 : 200);
    }
    if (app === 'intake') assert.ok(html.includes('Current v1.1 · Replaces v1.0'));
  }
  assert.equal(get('/index-status?app=unknown').status, 404);
});
const ask = (app,q) => get('/?'+ new URLSearchParams({app,q})).text();
test('Deadline lookup cites a timed procedure and respects unsupported qualifiers', async () => {
  const html = await ask('dispatch','What time is the upstream release deadline?');
  assert.match(html, /08:05 UTC/);
  assert.match(html, /doc=runbook&v=1\.1#s1/);
  assert.match(await ask('dispatch','What time is the weekend release deadline?'), /INSUFFICIENT EVIDENCE/);
  assert.match(await ask('ledger','What is the upstream release cutoff?'), /INSUFFICIENT EVIDENCE/);
});
test('Conversational incident lookups preserve code identity and scope', async () => {
  assert.match(await ask('ledger','Any guidance for rl—410?'), /doc=runbook&v=2\.1#s1/);
  assert.match(await ask('intake','Please explain error code CI422'), /doc=validation&v=1\.0#s1/);
  for (const question of ['Any guidance for CI422?', 'Any details about RL-411?', 'Please explain RL410 and DB410']) {
    assert.match(await ask('ledger',question), /INSUFFICIENT EVIDENCE/);
  }
});
test('Writer recovery requires documented instructions for the requested operation', async () => {
  const answer = await ask('ledger', 'Another process is still writing. Is it safe to run recovery?');
  assert.match(answer, /wait for any active writer to finish/);
  assert.match(answer, /doc=runbook&v=2\.1#s2/);
  for (const [app, question] of [
    ['ledger','Can I kill the active writer before replay?'],
    ['dispatch','Can I restart with an active writer?'],
    ['ledger','Can I force a restart while a writer is active?']
  ]) assert.match(await ask(app, question), /INSUFFICIENT EVIDENCE/);
});
test('Tied sections are browsable without claiming an answer', async () => {
  const html = await ask('dispatch', 'watermark');
  assert.match(html, /INSUFFICIENT EVIDENCE/);
  const choices = html.match(/<nav class="section-choices"[^>]*>(.*?)<\/nav>/s)[1];
  const urls = [...choices.matchAll(/href="([^"]+)"/g)].map(match => new URL(match[1], 'https://test.invalid'));
  assert.deepEqual(urls.map(url => url.hash), ['#s0', '#s2']);
  for (const url of urls) {
    assert.equal(url.searchParams.get('app'), 'dispatch');
    const source = await get(url.pathname + url.search).text();
    assert.ok(source.includes('id="' + url.hash.slice(1) + '"'));
    assert.ok(source.includes('/?app=dispatch&q=watermark#answer'));
  }
  for (const question of ['CI-422', 'DB-410', 'DH-118']) {
    assert.ok(!(await ask('dispatch', question)).includes('<nav class="section-choices"'));
  }
});
test('Unqualified frequency questions resolve to the selected pipeline schedule', async () => {
  for (const [app, cadence] of [['intake','every five minutes'], ['ledger','15 and 45 minutes past each hour'], ['dispatch','five minutes past each hour']]) {
    const html = await ask(app, 'How often does it run?');
    assert.ok(html.includes(cadence));
    assert.match(html, /doc=runbook&v=[\d.]+#s0/);
  }
  assert.match(await ask('dispatch', 'How often does it run during outages?'), /INSUFFICIENT EVIDENCE/);
});
test('Citation round trip restores the question, pipeline and answer anchor', async () => {
  const question = 'CI-204? & "CI-204" #CI-204';
  const html = await ask('intake', question);
  const citation = html.match(/<section class="answer">.*?<a href="([^"]+)"/s)[1];
  const source = await get(citation).text();
  const back = source.match(/<a href="([^"]+)">← Back to answer/)[1];
  const url = new URL(back, 'https://test.invalid');
  assert.equal(url.searchParams.get('q'), question);
  assert.equal(url.searchParams.get('app'), 'intake');
  assert.equal(url.hash, '#answer');
  assert.equal(await get(back).text(), html);
  assert.match(html, /id="answer"/);
  const direct = await get('/source?app=intake&doc=runbook&v=1.2').text();
  assert.match(direct, /href="\/\?app=intake">← Support desk/);
});
for(const [app,q,fragment] of [
  ['intake','What triggers this pipeline?',0],['ledger','What triggers this pipeline?',0],
  ['intake','How do I restart safely?',2],['ledger','How do I restart safely?',2],
  ['intake','What does CI-204 mean?',1],['ledger','What does RL-410 mean?',1]
]) test(app+' / '+q,async()=>{
  const body = await ask(app,q);
  const answer = body.match(/<section class="answer">.*?<p>(.*?)<\/p><a href="([^"]+)"/s);
  assert.ok(answer,'Expected a cited excerpt');
  const [path,anchor] = answer[2].split('#');
  assert.equal(anchor,'s'+fragment);
  assert.equal(new URL(path,'https://test.invalid').searchParams.get('app'),app);
  const doc = await get(path).text();
  assert.ok(doc.split('id="'+anchor+'"')[1].split('</section>')[0].includes('<p>'+answer[1]+'</p>'));
});
for(const [app,q] of [['intake','RL-410'],['ledger','CI-204'],['intake','What does RL-410 mean for restart?'],['ledger','Who invented chocolate?']])
  test('Abstain / '+app+' / '+q,async()=>assert.match(await ask(app,q),/INSUFFICIENT EVIDENCE/));
test('Reject invalid scope, version, oversized input and writes',()=>{
  assert.equal(get('/?app=constructor').status,404);
  assert.equal(get('/source?app=intake&doc=runbook&v=2.1').status,404);
  assert.equal(get('/?q='+'a'.repeat(321)).status,400);
  assert.equal(worker.fetch(new Request('https://test.invalid/',{method:'POST'})).status,405);
});

test('Code variants resolve only within the owning pipeline', async () => {
  for (const code of ['ci204', 'CI 204', 'CI‑204', 'ci _ 204']) {
    assert.match(await ask('intake', code), /v=1\.2#s1/);
    assert.match(await ask('ledger', code), /INSUFFICIENT EVIDENCE/);
  }
});

test('Near matches and mixed codes cannot select a known incident', async () => {
  for (const query of ['CI2040', 'CI204A', 'CI 204 and RL410', 'CI204.unknown']) {
    assert.match(await ask('intake', query), /INSUFFICIENT EVIDENCE/);
  }
});

test('Dispatch Board navigation, library, and suggested questions work together', async () => {
  const home = await get('/').text();
  assert.ok(home.includes('href="/?app=dispatch">Dispatch Board</a>'));
  const desk = await get('/?app=dispatch').text();
  for (const document of ['runbook', 'handbook']) {
    const path = '/source?app=dispatch&doc=' + document + '&v=1.1';
    assert.ok(desk.includes('href="' + path + '"'));
    assert.equal(get(path).status, 200);
  }
  const examples = [...desk.matchAll(/href="(\/\?app=dispatch&amp;q=[^"]+)"/g)];
  assert.equal(examples.length, 3);
  for (const [, link] of examples) {
    const response = await get(link.replace('&amp;', '&')).text();
    assert.match(response, /class="answer"><small>SOURCE EXCERPT/);
  }
});

test('Shared incident suffixes retain their pipeline namespace', async () => {
  assert.match(await ask('dispatch','DB410'), /doc=runbook&v=1\.1#s1/);
  assert.match(await ask('ledger','RL410'), /doc=runbook&v=2\.1#s1/);
  for (const [app, code] of [['ledger','DB410'], ['intake','DB410'], ['dispatch','RL410']]) {
    assert.match(await ask(app, code), /INSUFFICIENT EVIDENCE/);
  }
});
