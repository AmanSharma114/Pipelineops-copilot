import './build.mjs';
import http from 'node:http';
const { default: worker } = await import('./dist/server/index.js');
const port = Number(process.env.PORT || 4173);
http.createServer(async (req,res) => {
  try {
    const url = new URL(req.url,'http://localhost');
    const reply = await worker.fetch(new Request(url,{method:req.method}));
    res.writeHead(reply.status,Object.fromEntries(reply.headers));
    res.end(await reply.text());
  } catch {
    res.writeHead(400); res.end('Invalid request');
  }
}).listen(port,'127.0.0.1',()=>console.log('http://127.0.0.1:' + port));
