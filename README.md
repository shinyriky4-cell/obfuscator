# Roblox Lua/Luau Obfuscator

A small, dependency-free source obfuscator for Roblox projects. It is intentionally conservative: it uses a lexer instead of regular expressions, never rewrites comments or strings, and keeps Roblox/Lua built-ins in a blacklist.

## Features

- **Level 1:** local/parameter renaming and runtime numeric constant encoding.
- **Level 2:** Level 1 plus escaped source packing in a chunked runtime loader.
- **Level 3:** currently the same safe transforms as Level 2; reserved for future control-flow/VM passes rather than pretending those transformations are semantics-safe.
- Lua 5.1 and Luau-friendly output; no npm dependencies.
- Deterministic builds with `--seed`.
- Custom blacklist support for project globals.

This is a source transformer, not a cryptographic protection boundary. A runtime loader can always be instrumented, and `loadstring` must be enabled in the Roblox environment. Do not use obfuscation as a substitute for server-side validation or secret management.

## Install and use

```bash
npm test
node bin/lua-obfuscator.js game.lua -o game.obfuscated.lua --level 2 --seed 1234
node bin/lua-obfuscator.js game.lua --stdout --rename --constants
```

Add project-specific names to a file, one per line:

```text
MyRemote
MyService
```

Then pass `--blacklist globals.txt`. The built-in list includes `game`, `workspace`, `script`, `Instance`, `Vector3`, `Color3`, `UDim2`, `Enum`, `task`, `pcall`, `getgenv`, and standard Lua functions.

## Design notes

The implementation deliberately does not claim to provide a custom VM, anti-debugging, or anti-tamper system. Those features require a complete Luau parser, compiler, runtime compatibility tests, and a threat model. The current architecture leaves room for adding AST passes later without making the safe lexer pass dependent on a fragile regexp.
