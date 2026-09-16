'use strict';

const DEFAULT_BLACKLIST = new Set([
  '_G', '_ENV', 'self', 'game', 'workspace', 'script', 'Instance', 'Vector3', 'Vector2',
  'CFrame', 'Color3', 'UDim2', 'Enum', 'task', 'wait', 'spawn', 'pcall', 'xpcall', 'require',
  'shared', 'coroutine', 'math', 'string', 'table', 'select', 'tonumber', 'tostring', 'type',
  'pairs', 'ipairs', 'next', 'print', 'warn', 'error', 'assert', 'load', 'loadstring', 'unpack',
  'setmetatable', 'getmetatable', 'rawget', 'rawset', 'true', 'false', 'nil', 'and', 'or', 'not',
  'local', 'function', 'end', 'if', 'then', 'else', 'elseif', 'for', 'while', 'do', 'repeat',
  'until', 'return', 'break'
]);

function lex(source) {
  const out = []; let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) { let j = i + 1; while (j < source.length && /\s/.test(source[j])) j++; out.push({ type: 'ws', value: source.slice(i, j) }); i = j; continue; }
    if (source.startsWith('--', i)) { const j = source.indexOf('\n', i); const end = j < 0 ? source.length : j; out.push({ type: 'comment', value: source.slice(i, end) }); i = end; continue; }
    if (c === '"' || c === "'") { const q = c; let j = i + 1; while (j < source.length) { if (source[j] === '\\') j += 2; else if (source[j++] === q) break; } out.push({ type: 'string', value: source.slice(i, j) }); i = j; continue; }
    if (c === '[' && source[i + 1] === '[') { const k = source.indexOf(']]', i + 2); const end = k < 0 ? source.length : k + 2; out.push({ type: 'string', value: source.slice(i, end) }); i = end; continue; }
    const number = source.slice(i).match(/^(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
    if (number) { out.push({ type: 'number', value: number[0] }); i += number[0].length; continue; }
    const ident = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (ident) { out.push({ type: 'ident', value: ident[0] }); i += ident[0].length; continue; }
    const op = source.slice(i).match(/^(?:\.\.\.|::|==|~=|<=|>=|<<|>>|\/\/|\+=|-=|\*=|\/=|\.\.)/);
    if (op) { out.push({ type: 'punct', value: op[0] }); i += op[0].length; continue; }
    out.push({ type: 'punct', value: c }); i++;
  }
  return out;
}

function makeRng(seed) { let x = (Number(seed) >>> 0) || 0x9e3779b9; return () => ((x = (Math.imul(x ^ (x >>> 16), 2246822507) + 3266489909) >>> 0)); }
function luaBytes(value) { return [...Buffer.from(value, 'utf8')].map(String).join(','); }
function encodedNumber(value) { return `tonumber(string.char(${luaBytes(String(value))}))`; }
function encodedString(value) { const bytes = luaBytes(value); return bytes ? `string.char(${bytes})` : '""'; }
function base64(value) { return Buffer.from(value, 'utf8').toString('base64'); }
function xorBytes(value, key) { return [...Buffer.from(value, 'utf8')].map((b) => b ^ key); }
function luaArray(values) { return `{${values.join(',')}}`; }

function runtimeWrapper(source, options) {
  const mode = options.vm ? 'VM dispatcher mode (experimental)' : 'encoded loader mode';
  let payload = base64(source); let decoder;
  if (options.encrypt) {
    const key = (Number(options.key) || 173) & 255;
    payload = Buffer.from(xorBytes(source, key)).toString('base64');
    decoder = `local __key=${key}\nlocal function __decode(s) local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; local out={} local bits=0 local n=0 for i=1,#s do local v=b:find(s:sub(i,i),1,true) if v then n=n*64+v-1 bits=bits+6 if bits>=8 then bits=bits-8 out[#out+1]=string.char((math.floor(n/2^bits))%256) end end end local r={} for i=1,#out do r[i]=string.char((string.byte(out[i])-__key)%256) end return table.concat(r) end`;
  } else {
    decoder = `local function __decode(s) local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; local out={} local bits=0 local n=0 for i=1,#s do local v=b:find(s:sub(i,i),1,true) if v then n=n*64+v-1 bits=bits+6 if bits>=8 then bits=bits-8 out[#out+1]=string.char((math.floor(n/2^bits))%256) end end end return table.concat(out) end`;
  }
  const dispatch = options.vm ? `local __ip=1 local __ops={[1]=function() return __fn() end} while __ip do local __next=__ops[1] if not __next then break end __next() __ip=nil end` : 'return __fn()';
  return `-- Razer ${mode}\n${decoder}\nlocal __code=__decode(${JSON.stringify(payload)})\nlocal __load=loadstring or load\nif type(__load)~='function' then error('This mode requires a runtime with loadstring/load; use static mode for Roblox Studio') end\nlocal __fn=assert(__load(__code))\n${dispatch}`;
}

function obfuscate(source, options = {}) {
  const level = Math.max(1, Math.min(3, Number(options.level || 1)));
  const rename = options.rename ?? level >= 1; const constants = options.constants ?? level >= 1;
  const strings = options.strings ?? level >= 2; const base64Mode = Boolean(options.base64);
  const encrypt = Boolean(options.encrypt); const vm = Boolean(options.vm);
  const blacklist = new Set(DEFAULT_BLACKLIST); for (const item of options.blacklist || []) if (item && item.trim()) blacklist.add(item.trim());
  const tokens = lex(source); const rng = makeRng(options.seed == null ? Date.now() : options.seed); const names = new Map(); const used = new Set(); let declaration = false; let renamed = 0;
  const nextName = () => { let n; do n = `_${(rng() % 0xffffff).toString(36)}`; while (blacklist.has(n) || used.has(n)); used.add(n); return n; };
  for (const token of tokens) { if (token.type === 'ident' && token.value === 'local') { declaration = true; continue; } if (token.type !== 'ident' || blacklist.has(token.value)) continue; if (declaration && !names.has(token.value)) names.set(token.value, nextName()); if (rename && names.has(token.value)) { token.value = names.get(token.value); renamed++; } if (declaration) declaration = false; }
  let code = tokens.map((t) => t.type === 'number' && constants && !/^0[xX]/.test(t.value) ? encodedNumber(t.value) : t.type === 'string' && strings && t.value[0] !== '[' ? encodedString(t.value.slice(1, -1)) : t.value).join('');
  if (base64Mode || encrypt || vm) code = runtimeWrapper(code, { encrypt, vm, key: options.key });
  return { code, stats: { tokens: tokens.length, renamed, modes: { base64: base64Mode, encrypt, vm } } };
}

module.exports = { DEFAULT_BLACKLIST, lex, obfuscate };
