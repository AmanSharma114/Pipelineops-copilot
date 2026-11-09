import './build.mjs';
const { default: worker } = await import('./dist/server/index.js');
import test from 'node:test';
import assert from 'node:assert/strict';
const get = path => worker.fetch(new Request('https://test.invalid' + path));
const ask = (app,q) => get('/?'+ new URLSearchParams({app,q})).text();
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
    const path = '/source?app=dispatch&doc=' + document + '&v=1.0';
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
  assert.match(await ask('dispatch','DB410'), /doc=runbook&v=1\.0#s1/);
  assert.match(await ask('ledger','RL410'), /doc=runbook&v=2\.1#s1/);
  for (const [app, code] of [['ledger','DB410'], ['intake','DB410'], ['dispatch','RL410']]) {
    assert.match(await ask(app, code), /INSUFFICIENT EVIDENCE/);
  }
});
