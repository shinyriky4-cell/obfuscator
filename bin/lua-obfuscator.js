'use strict';

const DEFAULT_BLACKLIST = new Set([
  '_G', '_ENV', 'self', 'game', 'workspace', 'script', 'Instance', 'Vector3',
  'Vector2', 'CFrame', 'Color3', 'UDim2', 'Enum', 'task', 'wait', 'spawn',
  'pcall', 'xpcall', 'require', 'getgenv', 'getrenv', 'gethui', 'getscreen',
  'getfenv', 'setfenv', 'writefile', 'readfile', 'appendfile', 'listfiles', 'getcustomasset',
  'request', 'http_request', 'syn', 'loadstring', 'load', 'debug', 'mouse1click',
  'mouse1press', 'mouse1release', 'keypress', 'keyrelease', 'queue_on_teleport', 'shared',
  'coroutine', 'math', 'string', 'table', 'select', 'tonumber', 'tostring', 'type', 'pairs',
  'ipairs', 'next', 'print', 'warn', 'error', 'assert', 'unpack', 'setmetatable', 'getmetatable',
  'rawget', 'rawset', 'true', 'false', 'nil', 'and', 'or', 'not', 'local', 'function', 'end',
  'if', 'then', 'else', 'elseif', 'for', 'while', 'do', 'repeat', 'until', 'return', 'break'
]);

function escapeLuaString(value) {
  return JSON.stringify(value).replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
}

function encodeBytesAsLuaString(bytes) {
  if (!bytes.length) return '""';
  return 'string.char(' + bytes.map((b) => String(b)).join(', ') + ')';
}

function encodeStringLiteral(value) {
  return encodeBytesAsLuaString(Buffer.from(value, 'utf8'));
}

function encodeNumberLiteral(value) {
  const text = String(value);
  return 'tonumber(' + encodeBytesAsLuaString(Buffer.from(text, 'utf8')) + ')';
}

function lex(source) {
  const out = [];
  let i = 0;
  while (i < source.length) {
    const c = source[i];
    if (/\s/.test(c)) {
      let j = i + 1;
      while (j < source.length && /\s/.test(source[j])) j++;
      out.push({ type: 'ws', value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (source.startsWith('--', i)) {
      const lineEnd = source.indexOf('\n', i);
      const end = lineEnd < 0 ? source.length : lineEnd;
      out.push({ type: 'comment', value: source.slice(i, end) });
      i = end;
      continue;
    }

    if (c === '"' || c === "'") {
      const quote = c;
      let j = i + 1;
      while (j < source.length) {
        if (source[j] === '\\') {
          j += 2;
        } else if (source[j] === quote) {
          j++;
          break;
        } else {
          j++;
        }
      }
      out.push({ type: 'string', value: source.slice(i, j) });
      i = j;
      continue;
    }

    if (c === '[' && source[i + 1] === '[') {
      const endIndex = source.indexOf(']]', i + 2);
      const end = endIndex >= 0 ? endIndex + 2 : source.length;
      out.push({ type: 'string', value: source.slice(i, end) });
      i = end;
      continue;
    }

    const numberMatch = source.slice(i).match(/^(?:0[xX][0-9a-fA-F]+|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/);
    if (numberMatch) {
      out.push({ type: 'number', value: numberMatch[0] });
      i += numberMatch[0].length;
      continue;
    }

    const identMatch = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (identMatch) {
      out.push({ type: 'ident', value: identMatch[0] });
      i += identMatch[0].length;
      continue;
    }

    const punctMatch = source.slice(i).match(/^(?:\.\.\.|::|==|~=|<=|>=|\+=|-=|\*=|/=|%=|\.\.)/);
    if (punctMatch) {
      out.push({ type: 'punct', value: punctMatch[0] });
      i += punctMatch[0].length;
      continue;
    }

    out.push({ type: 'punct', value: c });
    i++;
  }

  return out;
}

function buildIdentifierMap(source, blacklist, seed = 1) {
  const tokens = lex(source);
  const map = new Map();
  const used = new Set();
  const rng = makeRng(seed);
  let waitingForDecl = false;
  let inFunctionParams = false;

  function nextName() {
    let candidate = '';
    do {
      const n = (rng() % 0x1000000).toString(36);
      candidate = '_' + n;
    } while (blacklist.has(candidate) || used.has(candidate));
    used.add(candidate);
    return candidate;
  }

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type !== 'ident') {
      if (token.value === '(' && i > 0 && tokens[i - 1].type === 'ident' && tokens[i - 1].value !== 'function') {
        inFunctionParams = true;
      }
      if (token.value === ')' && inFunctionParams) {
        inFunctionParams = false;
      }
      continue;
    }

    if (token.value === 'local') {
      waitingForDecl = true;
      continue;
    }

    if (waitingForDecl) {
      if (!blacklist.has(token.value) && !map.has(token.value)) {
        map.set(token.value, nextName());
      }
      waitingForDecl = false;
      continue;
    }

    if (!blacklist.has(token.value) && !map.has(token.value) && inFunctionParams) {
      map.set(token.value, nextName());
      continue;
    }

    if (token.value === 'function') {
      const nextToken = tokens[i + 1];
      if (nextToken && nextToken.type === 'ident' && !blacklist.has(nextToken.value)) {
        map.set(nextToken.value, nextName());
      }
    }
  }

  return { map, tokens };
}

function makeRng(seed) {
  let x = (seed >>> 0) || 0x9e3779b9;
  return function rand() {
    x = (Math.imul(x ^ (x >>> 16), 2246822507) + 3266489909) >>> 0;
    return x;
  };
}

function pack(source) {
  const bytes = Buffer.from(source, 'utf8');
  const payloadParts = [];
  const chunkSize = 900;

  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.slice(i, i + chunkSize);
    payloadParts.push(escapeLuaString(chunk.toString('utf8')));
  }

  return [
    '-- generated by Razer Obfuscator',
    'local __payload = ' + payloadParts.join(' .. '),
    'local __load = loadstring or load',
    'local __fn = assert(__load(__payload))',
    '__fn()'
  ].join('\n');
}

function wrapStandaloneSource(source) {
  const encoded = encodeStringLiteral(source);
  const key = 11;
  return [
    'local _PAYLOAD = ' + encoded,
    'local _KEY = ' + key,
    'local function _decode(s)',
    '  local out = {}',
    '  for i = 1, #s do',
    '    local byte = string.byte(s, i)',
    '    out[#out + 1] = string.char((byte - _KEY) % 256)',
    '  end',
    '  return table.concat(out)',
    'end',
    'local _CODE = _decode(_PAYLOAD)',
    'local _LOAD = loadstring or load',
    'local _FN = assert(_LOAD(_CODE))',
    '_FN()'
  ].join('\n');
}

function obfuscate(source, options = {}) {
  const level = Math.max(1, Math.min(3, Number(options.level || 1)));
  const doRename = options.rename ?? level >= 1;
  const doNumbers = options.constants ?? level >= 1;
  const doStrings = options.strings ?? level >= 2;
  const doPack = options.pack ?? level >= 2;
  const standalone = Boolean(options.standalone);
  const blacklist = new Set(DEFAULT_BLACKLIST);
  for (const item of (options.blacklist || [])) {
    if (item && item.trim()) blacklist.add(item.trim());
  }

  const result = buildIdentifierMap(source, blacklist, Number(options.seed || 1));
  const tokens = result.tokens;
  const renames = result.map;

  const transformed = [];
  let renamed = 0;
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (token.type === 'ident' && renames.has(token.value)) {
      transformed.push(renames.get(token.value));
      renamed++;
      continue;
    }

    if (token.type === 'number' && doNumbers) {
      transformed.push(encodeNumberLiteral(Number(token.value)));
      continue;
    }

    if (token.type === 'string' && doStrings) {
      transformed.push(encodeStringLiteral(token.value.slice(1, -1)));
      continue;
    }

    transformed.push(token.value);
  }

  let code = transformed.join('');

  if (standalone) {
    code = wrapStandaloneSource(code);
  } else if (doPack) {
    code = pack(code);
  }

  return {
    code,
    stats: {
      tokens: tokens.length,
      renamed
    }
  };
}

module.exports = {
  DEFAULT_BLACKLIST,
  lex,
  obfuscate,
  wrapStandaloneSource,
  pack
};
