const assert = require('assert');
const { lex, obfuscate } = require('../src/obfuscator');

const source = `-- do not touch game or "x = 10"\nlocal value = 10\nprint(game:GetService("Players"), value)`;
const tokens = lex(source);
assert(tokens.some((t) => t.type === 'comment'));
const result = obfuscate(source, { seed: 1, level: 1 });
assert(result.code.includes('game:GetService'));
assert(result.code.includes('tonumber(string.char'));
assert(!result.code.includes('local value = 10'));
const packed = obfuscate('return 42', { pack: true, seed: 1 }).code;
assert(packed.includes('__payload'));
assert(packed.includes('loadstring or load'));
console.log('obfuscator tests passed');
