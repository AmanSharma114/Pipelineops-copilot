const apps = new Map([['intake','Carrier Intake'],['ledger','Route Ledger'],['dispatch','Dispatch Board']]);
// Only fold numeric suffixes for namespaces actually used by the runbooks.
// This keeps ordinary phrases such as "at 15" and dotted job names intact.
const namespaces = new Set(documents.flatMap(doc => doc.sections.flatMap(section =>
  [...(section.title + ' ' + section.body).matchAll(/\b([A-Z]{2,})-\d+\b/g)].map(match => match[1])
)));
const codePattern = namespaces.size
  ? new RegExp('(?<![\\w.-])(' + [...namespaces].join('|') + ')[ \\t]*(?:[-_‐‑‒–—−][ \\t]*)?(\\d+)(?![\\w-]|\\.\\w)', 'gi')
  : null;
const stop = new Set('a an the do does did i is are was how what which when who my it if and of for on in at or to can should this pipeline job safely me tell means mean happens we'.split(' '));
function terms(text) {
  const normalized = codePattern ? text.replace(codePattern, '$1-$2') : text;
  return [...new Set((normalized.toLowerCase().match(/[a-z0-9]+(?:[-_.][a-z0-9]+)*/g) || [])
    .filter(t => !stop.has(t)).map(t => t.replace(/(?:ers|es|s)$/, end => end === 'ers' ? 'er' : '')))];
}
const index = documents.flatMap(doc => doc.sections.map((section,i) => ({
  doc, section, i, title:terms(section.title), words:terms(section.body)
})));

const approval = /\b(?:approv(?:e[ds]?|al|ing)|authoriz(?:e[ds]?|ation)|signs? off(?: on)?|gives? permission)\b/i;
const retention = /\b(?:retain(?:s|ed|ing)?|retention|kept|keep(?:s|ing)?)\b/i;
const duration = /\b(?:\d+|one|two|three|four|five|six|seven|eight|nine|ten)\s+(?:hours?|days?|weeks?|months?|years?)\b/i;
const frequencyQuestion = /\bhow (?:often|frequently)\b/i;
const recurrence = /\b(?:(?:each|every)\s+(?:(?:\d+|one|two|three|four|five|ten|fifteen|thirty)\s+)?(?:minutes?|hours?|days?|weeks?|months?)|hourly|daily|weekly|monthly)\b/i;
export function questionFact(query) {
  if (approval.test(query)) return 'approval';
  if (/\bretention\b/i.test(query) || (/\bhow (?:long|many)\b/i.test(query) &&
      (retention.test(query) || /\broll back\b/i.test(query)))) return 'retention';
  if (frequencyQuestion.test(query)) return 'frequency';
  return null;
}

function frequencyMatch(row, query) {
  const lower = query.toLowerCase();
  const selected = apps.get(row.doc.app).toLowerCase();
  for (const name of apps.values()) {
    if (name.toLowerCase() !== selected && lower.includes(name.toLowerCase())) return false;
  }
  const subject = lower.replace(frequencyQuestion, '').replace(selected, '').replace(/\bruns?\b/g, '');
  const requested = terms(subject);
  // An unqualified "it" refers to the selected pipeline's documented schedule.
  if (!requested.length && !row.title.includes('schedule')) return false;
  return row.section.body.split(/(?<=[.!?])\s+/).some(sentence => {
    if (!recurrence.test(sentence)) return false;
    const evidence = terms(sentence);
    return requested.every(term => evidence.includes(term));
  });
}

const questionWords = new Set('a an are be by can do does for from how i in is it long many may of on our period team the this to we what which who days hours weeks months years'.split(' '));
function factTerms(text) {
  return (text.toLowerCase().match(/[a-z0-9]+/g) || [])
    .filter(word => !questionWords.has(word))
    .map(word => word.replace(/s$/, ''));
}

function supportsFact(row, query, fact) {
  if (fact === 'frequency') return frequencyMatch(row, query);
  const relation = fact === 'approval' ? approval : retention;
  const requested = factTerms(query.replace(relation, ''));
  if (!requested.length) return false;
  return row.section.body.split(/(?<=[.!?])\s+/).some(sentence => {
    if (!relation.test(sentence)) return false;
    // Match the retained item before the duration, excluding incidental text
    // such as the batch that starts the retention clock.
    const period = fact === 'retention' && duration.exec(sentence);
    if (fact === 'retention' && !period) return false;
    // Ownership and approval can be separate clauses with different objects.
    const action = relation.exec(sentence);
    const evidence = period ? sentence.slice(0, period.index) : sentence.slice(action.index + action[0].length);
    const words = new Set(factTerms(evidence));
    return requested.every(word => words.has(word));
  });
}

function retrieve(app, query) {
  const tokens = terms(query);
  const fact = questionFact(query);
  const ranked = index.filter(row => row.doc.app === app).map(row => {
    if (fact) return { row, score: supportsFact(row, query, fact) ? 1 : 0 };
    const matches = tokens.filter(t => row.title.includes(t) || row.words.includes(t));
    const valid = matches.length && tokens.every(t => !/[-_.\d]/.test(t) || matches.includes(t));
    const score = valid && matches.length / tokens.length >= 0.5 ?
      matches.reduce((n,t) => n + (row.title.includes(t) ? 4 : 1),0) : 0;
    return { row, score };
  }).sort((a,b) => b.score-a.score);
  const best = ranked[0]?.score;
  return best ? ranked.filter(item => item.score === best).map(item => item.row) : [];
}
function esc(value) {
  return String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function href(app, doc, question) {
  const params = new URLSearchParams({app});
  if (question) params.set('q', question);
  params.set('doc', doc.id);
  params.set('v', doc.version);
  return '/source?' + params;
}
const pipelineRoles = {
  intake: 'Validate carrier scans',
  ledger: 'Reconcile route stops',
  dispatch: 'Publish loading plans'
};

function pipelineMap(active) {
  return `<nav class="flow" aria-label="Select a pipeline">
    <div class="flow-label">Freight data flow</div>
    <div class="stations">${[...apps].map(([id, name]) => `<div class="station">
      <a aria-current="${id === active ? 'page' : 'false'}" href="/?app=${id}">${name}</a>
      <small>${pipelineRoles[id]}</small></div>`).join('')}</div>
  </nav>`;
}

function sourceLibrary(app, scoped) {
  const retired = withdrawals.filter(doc => doc.app === app);
  return `<aside><div class="panel-title"><h2>Source library</h2><small>${scoped.length} ${scoped.length === 1 ? 'document' : 'documents'}</small></div>
    ${scoped.map(doc => `<details class="document"><summary><span>${esc(doc.title)}</span><small>v${doc.version}</small></summary>
      <ol>${doc.sections.map((section,i) => `<li><a href="${href(app, doc)}#s${i}">${esc(section.title)}</a></li>`).join('')}</ol></details>
      <a class="open-doc" href="${href(app,doc)}">Read document ↗</a>`).join('')}
    ${retired.map(doc => `<div class="withdrawal"><small>Retired document</small><a href="${href(app,doc)}">${esc(doc.title)} ↗</a></div>`).join('')}
    <a class="index-link" href="/index-status?app=${app}">View index status →</a>
  </aside>`;
}

function indexStatus(app, current) {
  const retired = withdrawals.filter(doc => doc.app === app);
  const sections = current.reduce((count, doc) => count + doc.sections.length, 0);
  const counts = [[current.length, 'Searchable documents'], [sections, 'Indexed sections'], [retired.length, 'Retired documents']];
  const rows = [...current, ...retired].map(doc => {
    const detail = doc.retired ? 'Withdrawn at v' + doc.version :
      'Current v' + doc.version + (doc.supersedes ? ' · Replaces v' + doc.supersedes : '');
    return `<li><a href="${href(app, doc)}">${esc(doc.title)}</a><small>${esc(detail)}</small></li>`;
  });
  return `<a href="/?app=${app}">← ${apps.get(app)} support desk</a>
    <article class="index-status"><small>${apps.get(app)}</small><h1>Index status</h1>
    <p>Document versions included in this deployment.</p>
    <dl>${counts.map(([count, label]) => `<div><dt>${label}</dt><dd>${count}</dd></div>`).join('')}</dl>
    <h2>Document versions</h2><ul>${rows.join('')}</ul></article>`;
}

function supportDesk(app, scoped, q, matches) {
  const hit = matches.length === 1 ? matches[0] : null;
  const ambiguous = matches.length > 1;
  const fallback = ambiguous ? 'Several sections match equally well. Open one below or add detail to your question.'
    : 'Try a specific error code or check the source library for this pipeline.';
  const choices = ambiguous ? `<nav class="section-choices" aria-label="Matching source sections"><ul>
    ${matches.map(({doc, section, i}) => `<li><a href="${href(app, doc, q)}#s${i}">${esc(section.title)}</a>
      <small>${esc(doc.title)} · v${esc(doc.version)}</small></li>`).join('')}</ul></nav>` : '';
  const examples = [
    ['Schedule', 'What triggers this pipeline?'],
    ['Recovery', 'How do I restart safely?']
  ];
  const incident = scoped.flatMap(doc => doc.sections).map(section => section.title.match(/^([A-Z]+-\d+) (.+)$/)).find(Boolean);
  const askLink = question => '/?app=' + app + '&amp;q=' + encodeURIComponent(question);
  const start = incident && !q ? `<div class="incident"><div><small>Sample incident</small>
    <h2><code>${incident[1]}</code> ${esc(incident[2])}</h2></div><a href="${askLink('What does ' + incident[1] + ' mean?')}">Investigate <span aria-hidden="true">→</span></a></div>` : '';
  const answer = q ? `<section class="answer"><small>${hit ? 'SOURCE EXCERPT' : 'INSUFFICIENT EVIDENCE'}</small>
    <h2 id="answer">${hit ? esc(hit.section.title) : ambiguous ? 'Choose a source section' : 'No confident match'}</h2><p>${hit ? esc(hit.section.body) : fallback}</p>${hit ? `<a href="${href(app,hit.doc,q)}#s${hit.i}">${esc(hit.doc.title)} · v${hit.doc.version} · ${esc(hit.section.title)} ↗</a>` : ''}</section>` : '';
  return `<div class="overview"><div><small class="eyebrow">Freight operations</small><h1>Pipeline support desk</h1>
    <p>Trace an incident from error code to recovery procedure.</p></div>${pipelineMap(app)}</div>
    <div class="layout"><div class="workspace"><h2 class="pipeline-name">${apps.get(app)}</h2>${start}
    <form action="/" method="get"><input type="hidden" name="app" value="${app}"><label for="q">Ask about ${apps.get(app)}</label>
    <div class="compose"><input id="q" name="q" maxlength="320" required placeholder="Enter a question or error code…" value="${esc(q)}"><button>Ask ↗</button></div>
    <div class="examples">${examples.map(([label,s]) => `<a title="${s}" href="${askLink(s)}">${label} ↗</a>`).join('')}</div></form>${answer}${choices}</div>
    ${sourceLibrary(app,scoped)}</div>`;
}

function page(main, status = 200) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PipelineOps Copilot</title><style>${css}</style><header><a class="brand" href="/"><b aria-hidden="true">⌁</b> PipelineOps <small>Copilot</small></a><div class="header-links"><span class="status">Synthetic demo</span><a href="https://github.com/AmanSharma114/Pipelineops-copilot">GitHub ↗</a></div></header><main>${main}</main></html>`,{status,headers:{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'}});
}
export default { fetch(request) {
  if(request.method !== 'GET') return new Response('Read only',{status:405,headers:{Allow:'GET'}});
  const {pathname,searchParams:p} = new URL(request.url);
  const app = p.get('app') ?? 'intake';
  if (!apps.has(app)) return new Response('Unknown pipeline',{status:404});
  const scoped = documents.filter(doc => doc.app === app);
  if (pathname === '/index-status') return page(indexStatus(app, scoped));
  if (pathname === '/source') {
    const retired = withdrawals.find(d => d.app === app && d.id === p.get('doc') && d.versions.includes(p.get('v')));
    if (retired) return page(`<article><small>${apps.get(app)} · Retired at v${retired.version}</small>
      <h1>${esc(retired.title)}</h1><p>This guide was withdrawn. Its passages have been removed from support search.</p>
      <a href="/?app=${app}">View current ${apps.get(app)} sources →</a></article>`, 410);
    const doc = scoped.find(d => d.id === p.get('doc') && d.version === p.get('v'));
    if (!doc) return new Response('Source unavailable',{status:404});
    const question = (p.get('q') || '').trim();
    const back = question && question.length <= 320
      ? `<a href="/?${new URLSearchParams({app, q:question})}#answer">← Back to answer</a>`
      : `<a href="/?app=${app}">← Support desk</a>`;
    return page(`${back}<article><small>${apps.get(app)} / v${doc.version}${doc.supersedes ? ` · Supersedes v${doc.supersedes}` : ''}</small><h1>${esc(doc.title)}</h1>${doc.sections.map((s,i)=>`<section id="s${i}"><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></section>`).join('')}</article>`);
  }
  if(pathname !== '/') return new Response('Unknown page',{status:404});
  const q = (p.get('q') || '').trim();
  if(q.length > 320) return new Response('Question exceeds 320 characters',{status:400});
  const matches = q ? retrieve(app,q) : [];
  return page(supportDesk(app, scoped, q, matches));
}};
