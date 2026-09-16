const assert = require('assert');
const { obfuscate } = require('../src/obfuscator');
const source = 'local value = 42\nprint(value)\n';
const result = obfuscate(source, { level: 1, seed: 7 });
assert(result.code.includes('tonumber('));
assert(result.code.includes('print('));
assert.throws(() => obfuscate(source, { vm: true }), /real VM backend is not bundled/);
assert.throws(() => obfuscate(source, { base64: true }), /Roblox-safe mode/);
console.log('obfuscator tests passed');
