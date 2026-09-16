#!/usr/bin/env node
'use strict';
const fs = require('fs');
const { obfuscate } = require('../src/obfuscator');
function usage() { console.error('Usage: lua-obfuscator <input.lua> [-o output.lua] [--level 1|2|3] [--standalone] [--stdout]'); process.exit(2); }
const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) usage();
const input = args.shift(); const options = { level: 1 }; let outputPath;
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '-o': case '--output': outputPath = args[++i]; break;
    case '--level': options.level = Number(args[++i]); break;
    case '--rename': options.rename = true; break;
    case '--constants': options.constants = true; break;
    case '--strings': options.strings = true; break;
    case '--pack': options.pack = true; break;
    case '--standalone': options.standalone = true; break;
    case '--seed': options.seed = Number(args[++i]); break;
    case '--blacklist': options.blacklist = fs.readFileSync(args[++i], 'utf8').split(/\r?\n/); break;
    case '--stdout': options.stdout = true; break;
    default: usage();
  }
}
if (!fs.existsSync(input)) throw new Error(`Input file does not exist: ${input}`);
const result = obfuscate(fs.readFileSync(input, 'utf8'), options);
if (options.stdout || !outputPath) process.stdout.write(result.code + '\n');
else fs.writeFileSync(outputPath, result.code + '\n', 'utf8');
if (!options.stdout) console.error(`Obfuscated ${input} (${result.stats.tokens} tokens, ${result.stats.renamed} names renamed)`);
