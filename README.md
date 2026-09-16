#!/usr/bin/env node
'use strict';

const fs = require('fs');
const { obfuscate } = require('../src/obfuscator');

function usage() {
  console.error(`Usage: lua-obfuscator <input.lua> [-o output.lua] [options]

Options:
  --level <1|2|3>       1 = rename + constants, 2 = string hiding + pack, 3 = strongest safe mode
  --rename              Force renaming
  --constants           Force constant encoding
  --strings             Force string encoding
  --pack                Pack into a runtime loader
  --standalone          Emit a single paste-and-run Luau script with no external HTTPS
  --seed <number>       Stable deterministic output seed
  --blacklist <file>    Path to a newline-delimited global blacklist
  --stdout              Write output to stdout
  --help                Show this message
`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (!args.length || args.includes('--help') || args.includes('-h')) usage();

const input = args.shift();
const options = { level: 1 };
let outputPath = null;

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  switch (arg) {
    case '-o':
      outputPath = args[++i];
      break;
    case '--level':
      options.level = Number(args[++i]);
      break;
    case '--rename':
      options.rename = true;
      break;
    case '--constants':
      options.constants = true;
      break;
    case '--strings':
      options.strings = true;
      break;
    case '--pack':
      options.pack = true;
      break;
    case '--standalone':
      options.standalone = true;
      break;
    case '--seed':
      options.seed = Number(args[++i]);
      break;
    case '--blacklist':
      options.blacklist = fs.readFileSync(args[++i], 'utf8').split(/\r?\n/);
      break;
    case '--stdout':
      options.stdout = true;
      break;
    default:
      usage();
  }
}

if (!fs.existsSync(input)) {
  throw new Error('Input file does not exist: ' + input);
}

const source = fs.readFileSync(input, 'utf8');
const result = obfuscate(source, options);
const output = result.code + '\n';

if (options.stdout || !outputPath) {
  process.stdout.write(output);
} else {
  fs.writeFileSync(outputPath, output, 'utf8');
}

if (!options.stdout) {
  console.error(`Obfuscated ${input} (${result.stats.tokens} tokens, ${result.stats.renamed} names renamed)`);
}
