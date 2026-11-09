const apps = new Map([['intake','Carrier Intake'],['ledger','Route Ledger']]);
const stop = new Set('a an the do does did i is are was how what which when who my it if and of for on in at or to can should this pipeline job safely me tell means mean happens we'.split(' '));
function terms(text) {
  return [...new Set((text.toLowerCase().match(/[a-z0-9]+(?:[-_.][a-z0-9]+)*/g) || [])
    .filter(t => !stop.has(t)).map(t => t.replace(/(?:ers|es|s)$/, end => end === 'ers' ? 'er' : '')))];
}
const index = documents.flatMap(doc => doc.sections.map((section,i) => ({
  doc, section, i, title:terms(section.title), words:terms(section.body)
})));
function retrieve(app, query) {
  const tokens = terms(query);
  const ranked = index.filter(row => row.doc.app === app).map(row => {
    const matches = tokens.filter(t => row.title.includes(t) || row.words.includes(t));
    const valid = matches.length && tokens.every(t => !/[-_.\d]/.test(t) || matches.includes(t));
    const score = valid && matches.length / tokens.length >= 0.5 ?
      matches.reduce((n,t) => n + (row.title.includes(t) ? 4 : 1),0) : 0;
    return { row, score };
  }).sort((a,b) => b.score-a.score);
  return ranked[0]?.score && ranked[0].score !== ranked[1]?.score ? ranked[0].row : null;
}
function esc(value) {
  return String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function href(app,doc) {
  return '/source?app='+encodeURIComponent(app)+'&doc='+encodeURIComponent(doc.id)+'&v='+encodeURIComponent(doc.version);
}
function page(main) {
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>PipelineOps Copilot</title><style>${css}</style><header><div class="brand"><b>⌁</b> PipelineOps <small>/ Copilot</small></div><span class="status">Synthetic workspace</span></header><main>${main}</main></html>`,{headers:{'content-type':'text/html; charset=utf-8','content-security-policy':"default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",'x-content-type-options':'nosniff'}});
}
export default { fetch(request) {
  if(request.method !== 'GET') return new Response('Read only',{status:405,headers:{Allow:'GET'}});
  const {pathname,searchParams:p} = new URL(request.url);
  const app = p.get('app') ?? 'intake';
  if (!apps.has(app)) return new Response('Unknown pipeline',{status:404});
  const scoped = documents.filter(doc => doc.app === app);
  if (pathname === '/source') {
    const doc = scoped.find(d => d.id === p.get('doc') && d.version === p.get('v'));
    if (!doc) return new Response('Source unavailable',{status:404});
    return page(`<a href="/?app=${app}">← Support desk</a><article><small>${apps.get(app)} / v${doc.version}</small><h1>${esc(doc.title)}</h1>${doc.sections.map((s,i)=>`<section id="s${i}"><h2>${esc(s.title)}</h2><p>${esc(s.body)}</p></section>`).join('')}</article>`);
  }
  if(pathname !== '/') return new Response('Unknown page',{status:404});
  const q = (p.get('q') || '').trim();
  if(q.length > 320) return new Response('Question exceeds 320 characters',{status:400});
  const hit = q && retrieve(app,q);
  const samples = ['What triggers this pipeline?', 'How do I restart safely?', app==='intake'?'What does CI-204 mean?':'What does RL-410 mean?'];
  return page(`<nav aria-label="Pipeline">${[...apps].map(([id,name])=>`<a aria-current="${app===id?'page':'false'}" href="/?app=${id}">${name}</a>`).join('')}</nav><div class="layout"><div><small class="kicker">PIPELINE SUPPORT DESK</small><h1>${apps.get(app)}</h1><p>Ask about schedules, recovery steps, or an error code.</p><form action="/" method="get"><input type="hidden" name="app" value="${app}"><label for="q">Your question</label><div class="compose"><input id="q" name="q" maxlength="320" required placeholder="Ask about ${apps.get(app)}…" value="${esc(q)}"><button>Ask ↗</button></div></form>${q?`<section class="answer"><small>${hit?'RUNBOOK EXCERPT':'INSUFFICIENT EVIDENCE'}</small><h2>${hit?esc(hit.section.title):'No confident match'}</h2><p>${hit?esc(hit.section.body):'Try a specific error code or open the runbook to check its coverage.'}</p>${hit?`<a href="${href(app,hit.doc)}#s${hit.i}">${esc(hit.doc.title)} · v${hit.doc.version} · ${esc(hit.section.title)} ↗</a>`:''}</section>`:''}<h2>Try a question</h2><div class="examples">${samples.map(s=>`<a href="/?app=${app}&amp;q=${encodeURIComponent(s)}">${s} <span>↗</span></a>`).join('')}</div></div><aside><small>SOURCE LIBRARY</small>${scoped.map(d=>`<h2><a href="${href(app,d)}">${esc(d.title)} ↗</a></h2><p>Version ${d.version} · ${d.sections.length} sections</p><ol>${d.sections.map((s,i)=>`<li><a href="${href(app,d)}#s${i}">${esc(s.title)}</a></li>`).join('')}</ol>`).join('')}</aside></div>`);
}};
