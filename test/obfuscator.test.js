# Razer Obfuscator

Razer Obfuscator is a lightweight, self-contained Lua/Luau obfuscation tool intended for standard Roblox Studio and Luau runtime environments.

It is designed around safe, offline behavior:

- no HTTPS requirement
- no remote API dependency
- no external runtime dependency
- pure Luau output for paste-and-run use
- deterministic renaming with a seed
- optional packed output for a standalone runtime loaded from the same script
- global blacklist support for Roblox names

This project does not target executor APIs or custom exploit runtimes.

## Supported targets

- Roblox Studio Luau scripts
- vanilla Lua-compatible runtimes
- ordinary Roblox server/client scripts

## Unsupported targets

- executor-only globals and APIs such as `getgenv`, `getrenv`, `syn.request`, `writefile`, `gethui`, `mouse1click`, or similar environment-dependent hooks
- external runtime shims or exploit SDKs
- bypass-oriented compatibility layers

## Usage

```bash
npm test
node bin/lua-obfuscator.js input.lua --output out.lua --standalone --level 2 --seed 1234
node bin/lua-obfuscator.js input.lua --stdout --rename --constants --strings
```

## Supported options

- `--level 1|2|3`
- `--rename`
- `--constants`
- `--strings`
- `--pack`
- `--standalone`
- `--blacklist path/to/file.txt`
- `--seed <number>`
- `--stdout`

## Standalone output mode

The `--standalone` option emits one script that embeds the transformed Luau source and executes it in the same file. It does not call any external network service and does not require HTTPS.

## Safety and privacy

The generated script is designed to remain self-contained and local-only. It does not require a network connection or a remote service to run.

This project intentionally avoids executor API compatibility or anti-analysis features designed to bypass Roblox protections. Obfuscation is not a security boundary and cannot protect secrets that are delivered to a client.
