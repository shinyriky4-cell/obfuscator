'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const { obfuscate } = require('./src/obfuscator');

const PORT = Number(process.env.PORT || 8080);
const MAX_SOURCE = 200000;
const publicDir = path.join(__dirname, 'public');

function json(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'content-length': Buffer.byteLength(body) });
  res.end(body);
}
function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; if (Buffer.byteLength(body) > MAX_SOURCE + 10000) reject(new Error('Source is too large')); });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}
function safeFile(reqPath) {
  const requested = reqPath === '/' ? '/index.html' : reqPath;
  const resolved = path.resolve(publicDir, '.' + requested);
  return resolved.startsWith(publicDir + path.sep) ? resolved : null;
}
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/obfuscate') {
    try {
      const input = JSON.parse(await readBody(req));
      if (typeof input.source !== 'string' || input.source.length > MAX_SOURCE) return json(res, 400, { error: `Source must be a string of at most ${MAX_SOURCE} characters.` });
      const result = obfuscate(input.source, {
        level: Number(input.level) || 1,
        seed: input.seed == null ? Date.now() : Number(input.seed),
        pack: Boolean(input.pack),
        rename: input.rename !== false,
        constants: input.constants !== false,
        blacklist: Array.isArray(input.blacklist) ? input.blacklist : []
      });
      return json(res, 200, result);
    } catch (error) { return json(res, 400, { error: error.message }); }
  }
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });
  const file = safeFile((req.url || '/').split('?')[0]);
  if (!file || !fs.existsSync(file)) return json(res, 404, { error: 'Not found' });
  res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).pipe(res);
});
server.listen(PORT, '0.0.0.0', () => console.log(`Razer Obfuscator listening on port ${PORT}`));
