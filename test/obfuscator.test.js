const assert = require('assert');
const { obfuscate } = require('../src/obfuscator');

const source = 'local value = 42\nprint(value)\n';
const result = obfuscate(source, { level: 1, seed: 7 });
assert(result.code.includes('tonumber('));
assert(!result.code.includes('local value = 42'));

const standalone = obfuscate(source, { standalone: true, seed: 7 });
assert.strictEqual(typeof standalone.code, 'string');
assert(standalone.code.includes('Razer standalone output'));

console.log('obfuscator tests passed');
