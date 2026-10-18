import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve(process.argv[2] || 'dist');
const port = Number(process.env.PORT || 4173);
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
http.createServer(async (req, res) => {
  let path;
  try { path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  // The same build is tested at the real Pages project prefix.
  if (path.startsWith('/garage-tv/')) path = path.slice('/garage-tv'.length);
  const file = resolve(root, '.' + (path === '/' ? '/index.html' : path));
  if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try { const contents = await readFile(file); res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'Referrer-Policy': 'strict-origin-when-cross-origin' }); res.end(contents); }
  catch { res.writeHead(404).end('Not found'); }
}).listen(port, '0.0.0.0', () => console.log('Garage TV: http://localhost:' + port + '/garage-tv/'));
