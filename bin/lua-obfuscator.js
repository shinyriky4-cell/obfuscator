#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const { obfuscate } = require('../src/obfuscator');

function usage() {
  console.error(`Usage: lua-obfuscator <input.lua> [-o output.lua] [options]

Options:
  --level <1|2|3>       1=renaming/constants, 2=packing, 3=all safe transforms
  --pack                Pack the source in a runtime loader
  --rename              Rename local variables and parameters
  --constants           Hide numeric constants
  --seed <number>       Deterministic output seed
  --blacklist <file>    Newline-separated identifiers to never rename
  --stdout              Write output to stdout
`);
  process.exit(2);
}

const args = process.argv.slice(2);
if (!args.length || args.includes('-h') || args.includes('--help')) usage();
const input = args.shift();
let output = null;
const options = { level: 1 };
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '-o') output = args[++i];
  else if (arg === '--level') options.level = Number(args[++i]);
  else if (arg === '--pack') options.pack = true;
  else if (arg === '--rename') options.rename = true;
  else if (arg === '--constants') options.constants = true;
  else if (arg === '--stdout') options.stdout = true;
  else if (arg === '--seed') options.seed = Number(args[++i]);
  else if (arg === '--blacklist') options.blacklist = fs.readFileSync(args[++i], 'utf8').split(/\r?\n/);
  else usage();
}
if (!fs.existsSync(input)) throw new Error(`Input does not exist: ${input}`);
const source = fs.readFileSync(input, 'utf8');
const result = obfuscate(source, options);
if (options.stdout || !output) process.stdout.write(result.code + '\n');
else fs.writeFileSync(output, result.code + '\n');
if (!options.stdout) console.error(`Obfuscated ${input} (${result.stats.tokens} tokens, ${result.stats.renamed} names renamed)`);
