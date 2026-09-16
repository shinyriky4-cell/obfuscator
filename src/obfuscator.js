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
function makeName(rng, blacklist, used) { let name; do name = `_${(rng() % 0xffffff).toString(36)}`; while (blacklist.has(name) || used.has(name)); used.add(name); return name; }

function obfuscate(source, options = {}) {
  const level = Math.max(1, Math.min(3, Number(options.level || 1)));
  const robloxSafe = options.robloxSafe !== false;
  const rename = options.rename ?? level >= 1;
  const constants = options.constants ?? level >= 1;
  const blacklist = new Set(DEFAULT_BLACKLIST);
  for (const item of options.blacklist || []) if (item && item.trim()) blacklist.add(item.trim());

  // A loader that reconstructs source requires loadstring/load. Those APIs are
  // not guaranteed in Roblox and are deliberately opt-in, never the default.
  if (robloxSafe && (options.base64 || options.encrypt || options.vm || options.runtimeLoader)) {
    throw new Error('Roblox-safe mode emits static Luau only; disable Base64/encryption/VM/loader modes because loadstring/load is not guaranteed.');
  }
  if (options.vm) throw new Error('A real VM backend is not bundled yet; the old dispatcher was removed rather than misrepresenting it as a VM.');

  const tokens = lex(source);
  const rng = makeRng(options.seed == null ? Date.now() : options.seed);
  const names = new Map(); const used = new Set(); let declaration = false; let renamed = 0;
  for (const token of tokens) {
    if (token.type === 'ident' && token.value === 'local') { declaration = true; continue; }
    if (token.type !== 'ident' || blacklist.has(token.value)) continue;
    if (rename && declaration && !names.has(token.value)) names.set(token.value, makeName(rng, blacklist, used));
    if (rename && names.has(token.value)) { token.value = names.get(token.value); renamed++; }
    if (declaration) declaration = false;
  }
  const code = tokens.map((token) => token.type === 'number' && constants && !/^0[xX]/.test(token.value)
    ? encodedNumber(token.value) : token.value).join('');
  return { code, stats: { tokens: tokens.length, renamed, runtime: 'static-roblox-safe' } };
}

module.exports = { DEFAULT_BLACKLIST, lex, obfuscate };
